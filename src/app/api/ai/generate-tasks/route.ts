import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTasksFromProject } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const body = await req.json();
  const { projectId, description } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get the user's Anthropic API key
  const settings = await db.userSettings.findUnique({
    where: { userId },
  });
  const ollamaConfig = { url: settings?.ollamaUrl, model: settings?.ollamaModel };

  const generatedTasks = await generateTasksFromProject(
    project.name,
    description ?? project.description ?? "",
    ollamaConfig
  );

  // Get max order for existing tasks in the project
  const maxOrderTask = await db.task.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  let orderCounter = (maxOrderTask?.order ?? -1) + 1;

  // Create tasks in DB
  const createdTasks = await db.$transaction(
    generatedTasks.map((t) =>
      db.task.create({
        data: {
          title: t.title,
          description: t.description,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes,
          projectId: project.id,
          userId,
          order: orderCounter++,
        },
        include: { project: true },
      })
    )
  );

  return NextResponse.json(createdTasks, { status: 201 });
}
