import Anthropic from "@anthropic-ai/sdk";

function getClient(apiKey?: string): Anthropic {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Anthropic API key is required. Set ANTHROPIC_API_KEY env var or pass apiKey param."
    );
  }
  return new Anthropic({ apiKey: key });
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
  apiKey?: string
): Promise<GeneratedTask[]> {
  const client = getClient(apiKey);

  const systemPrompt = `You are a project management assistant that helps break down projects into actionable tasks.
When given a project name and description, you create a structured list of tasks that covers all the work needed to complete the project.
Each task should be specific, actionable, and independently completable.
Always respond with valid JSON only — no markdown fences, no extra text.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Break down the following project into actionable tasks.

Project Name: ${projectName}
Project Description: ${projectDescription}

Return a JSON array of tasks. Each task must have:
- title: string (short, action-oriented)
- description: string (1-2 sentences explaining what to do)
- priority: one of "LOW", "MEDIUM", "HIGH", "URGENT"
- estimatedMinutes: number (realistic time estimate)

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as GeneratedTask[];
    }
    return [];
  } catch {
    // Attempt to extract JSON array from the text if parsing fails
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as GeneratedTask[];
    }
    throw new Error(`Failed to parse AI response as JSON: ${text}`);
  }
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
  apiKey?: string
): Promise<PrioritizedTask[]> {
  const client = getClient(apiKey);

  const systemPrompt = `You are a productivity expert that helps people prioritize their work effectively.
You analyze tasks, deadlines, and context to determine the optimal order and priority for getting things done.
Always respond with valid JSON only — no markdown fences, no extra text.`;

  const tasksJson = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    currentPriority: t.priority,
    dueDate: t.dueDate?.toISOString() ?? null,
    estimatedMinutes: t.estimatedMinutes,
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Prioritize the following tasks based on the provided context.

Context: ${context}

Tasks:
${JSON.stringify(tasksJson, null, 2)}

Return a JSON array where each item has:
- id: string (same as input)
- title: string (same as input)
- priority: one of "LOW", "MEDIUM", "HIGH", "URGENT" (may differ from currentPriority)
- reasoning: string (1 sentence explaining why this priority)
- order: number (1 = highest priority, ascending)

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as PrioritizedTask[];
    }
    return [];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as PrioritizedTask[];
    }
    throw new Error(`Failed to parse AI response as JSON: ${text}`);
  }
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
    startTime: string; // ISO string
    endTime: string;   // ISO string
  }>,
  workStart: number, // hour, e.g. 9
  workEnd: number,   // hour, e.g. 18
  date: string,      // YYYY-MM-DD
  apiKey?: string
): Promise<ScheduledBlock[]> {
  const client = getClient(apiKey);

  const systemPrompt = `You are a scheduling assistant that creates optimized daily schedules.
You fit tasks into available time slots, respecting existing calendar events and work hours.
Prioritize urgent and high-priority tasks earlier in the day.
Always respond with valid JSON only — no markdown fences, no extra text.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Create a schedule for ${date}.

Work hours: ${workStart}:00 to ${workEnd}:00

Existing calendar events (blocked time):
${
  events.length > 0
    ? JSON.stringify(events, null, 2)
    : "No existing events."
}

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

Return a JSON array of scheduled blocks. Each block must have:
- taskId: string (matching task id)
- startTime: string (ISO 8601 datetime, e.g. "${date}T09:00:00.000Z")
- endTime: string (ISO 8601 datetime)
- date: string (YYYY-MM-DD, i.e. "${date}")

Rules:
- Do not overlap with existing calendar events.
- Only schedule within work hours.
- Include a 5-minute buffer between tasks.
- Skip tasks that don't fit in remaining time.
- Urgent tasks first, then High, then Medium, then Low.

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed as ScheduledBlock[];
    }
    return [];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]) as ScheduledBlock[];
    }
    throw new Error(`Failed to parse AI response as JSON: ${text}`);
  }
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
  apiKey?: string
): Promise<string> {
  const client = getClient(apiKey);

  const systemPrompt = `You are a project analyst that generates concise, insightful project summaries.
Write in clear, professional markdown. Focus on progress, risks, and next steps.`;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "IN_PROGRESS"
  ).length;
  const urgentTasks = tasks.filter(
    (t) => t.priority === "URGENT" && t.status !== "DONE"
  ).length;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Generate a project summary in markdown for the following project.

Project: ${project.name}
Description: ${project.description ?? "No description provided."}
Created: ${project.createdAt.toISOString()}

Statistics:
- Total tasks: ${totalTasks}
- Completed: ${doneTasks}
- In progress: ${inProgressTasks}
- Urgent/unfinished: ${urgentTasks}
- Completion rate: ${totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%

Tasks:
${JSON.stringify(
  tasks.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    dueDate: t.dueDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
  })),
  null,
  2
)}

Write a markdown summary with sections: Overview, Progress, Key Risks, and Next Steps.
Keep it concise (under 300 words).`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text;
}
