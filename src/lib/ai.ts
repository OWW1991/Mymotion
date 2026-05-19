// ─── Ollama client ────────────────────────────────────────────────────────────

interface OllamaConfig {
  url?: string;
  model?: string;
}

async function ollamaChat(
  systemPrompt: string,
  userPrompt: string,
  config?: OllamaConfig
): Promise<string> {
  const baseUrl = config?.url ?? process.env.OLLAMA_URL ?? "http://localhost:11434";
  const model = config?.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

function extractJson<T>(text: string): T {
  // Strip markdown fences if present
  const clean = text.replace(/```(?:json)?\n?/g, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    const match = clean.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Could not parse JSON from AI response: ${text}`);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimatedMinutes: number;
}

export interface PrioritizedTask {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  reasoning: string;
  order: number;
}

export interface ScheduledBlock {
  taskId: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  date: string;      // YYYY-MM-DD
}

// ─── generateTasksFromProject ─────────────────────────────────────────────────

export async function generateTasksFromProject(
  projectName: string,
  projectDescription: string,
  config?: OllamaConfig
): Promise<GeneratedTask[]> {
  const systemPrompt =
    "You are a project management assistant. Break down projects into actionable tasks. " +
    "Respond with valid JSON only — no markdown fences, no extra text.";

  const userPrompt = `Break down the following project into actionable tasks.

Project Name: ${projectName}
Project Description: ${projectDescription}

Return a JSON array of tasks. Each task must have:
- title: string (short, action-oriented)
- description: string (1-2 sentences)
- priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
- estimatedMinutes: number

Return ONLY the JSON array.`;

  const text = await ollamaChat(systemPrompt, userPrompt, config);
  const parsed = extractJson<GeneratedTask[]>(text);
  return Array.isArray(parsed) ? parsed : [];
}

// ─── prioritizeTasks ──────────────────────────────────────────────────────────

export async function prioritizeTasks(
  tasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    priority: string;
    dueDate?: Date | null;
    estimatedMinutes: number;
  }>,
  context: string,
  config?: OllamaConfig
): Promise<PrioritizedTask[]> {
  const systemPrompt =
    "You are a productivity expert. Analyze tasks and return optimal priority order. " +
    "Respond with valid JSON only — no markdown fences, no extra text.";

  const tasksJson = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    currentPriority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    estimatedMinutes: t.estimatedMinutes,
  }));

  const userPrompt = `Prioritize the following tasks.

Context: ${context}

Tasks:
${JSON.stringify(tasksJson, null, 2)}

Return a JSON array where each item has:
- id: string (same as input)
- title: string (same as input)
- priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
- reasoning: string (1 sentence)
- order: number (1 = highest priority)

Return ONLY the JSON array.`;

  const text = await ollamaChat(systemPrompt, userPrompt, config);
  const parsed = extractJson<PrioritizedTask[]>(text);
  return Array.isArray(parsed) ? parsed : [];
}

// ─── generateDaySchedule ──────────────────────────────────────────────────────

export async function generateDaySchedule(
  tasks: Array<{
    id: string;
    title: string;
    estimatedMinutes: number;
    priority: string;
    dueDate?: Date | null;
  }>,
  events: Array<{
    title: string;
    startTime: string;
    endTime: string;
  }>,
  workStart: number,
  workEnd: number,
  date: string,
  config?: OllamaConfig
): Promise<ScheduledBlock[]> {
  const systemPrompt =
    "You are a scheduling assistant. Fit tasks into free time slots respecting work hours and existing events. " +
    "Respond with valid JSON only — no markdown fences, no extra text.";

  const userPrompt = `Create a schedule for ${date}.

Work hours: ${workStart}:00 to ${workEnd}:00

Existing events (blocked):
${events.length > 0 ? JSON.stringify(events, null, 2) : "None."}

Tasks to schedule:
${JSON.stringify(
  tasks.map((t) => ({
    id: t.id,
    title: t.title,
    estimatedMinutes: t.estimatedMinutes,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
  })),
  null,
  2
)}

Return a JSON array of scheduled blocks, each with:
- taskId: string
- startTime: ISO 8601 (e.g. "${date}T09:00:00.000Z")
- endTime: ISO 8601
- date: "${date}"

Rules: no overlaps, 5-min buffer between tasks, URGENT → HIGH → MEDIUM → LOW order.
Return ONLY the JSON array.`;

  const text = await ollamaChat(systemPrompt, userPrompt, config);
  const parsed = extractJson<ScheduledBlock[]>(text);
  return Array.isArray(parsed) ? parsed : [];
}

// ─── generateProjectSummary ───────────────────────────────────────────────────

export async function generateProjectSummary(
  project: {
    id: string;
    name: string;
    description?: string | null;
    createdAt: Date;
  },
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    estimatedMinutes: number;
    completedAt?: Date | null;
    dueDate?: Date | null;
  }>,
  config?: OllamaConfig
): Promise<string> {
  const systemPrompt =
    "You are a project analyst. Write concise, insightful project summaries in markdown. " +
    "Focus on progress, risks, and next steps.";

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const urgentTasks = tasks.filter(
    (t) => t.priority === "URGENT" && t.status !== "DONE"
  ).length;

  const userPrompt = `Generate a project summary in markdown.

Project: ${project.name}
Description: ${project.description ?? "No description."}
Created: ${project.createdAt.toISOString()}

Stats: ${doneTasks}/${totalTasks} done, ${inProgressTasks} in progress, ${urgentTasks} urgent pending.
Completion: ${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%

Tasks:
${JSON.stringify(
  tasks.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    dueDate: t.dueDate?.toISOString() ?? null,
  })),
  null,
  2
)}

Write sections: Overview, Progress, Key Risks, Next Steps. Keep under 300 words.`;

  return await ollamaChat(systemPrompt, userPrompt, config);
}
