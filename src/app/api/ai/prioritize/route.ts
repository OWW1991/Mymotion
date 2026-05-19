import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { prioritizeTasks } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;


  const body = await req.json();
  const { projectId } = body as { projectId?: string };

  const where: Record<string, unknown> = {
    userId,
    status: { in: ["TODO", "IN_PROGRESS"] },
  };
  if (projectId) where.projectId = projectId;

  const tasks = await db.task.findMany({ where });

  if (tasks.length === 0) {
    return NextResponse.json([]);
  }

  const settings = await db.userSettings.findUnique({
    where: { userId },
  });
  const apiKey = settings?.anthropicApiKey ?? undefined;

  const context = projectId
    ? `Prioritizing tasks for a specific project.`
    : `Prioritizing all pending tasks for the user's workday.`;

  const prioritized = await prioritizeTasks(tasks, context, apiKey);

  // Update tasks in DB with new priorities and order
  const updates = prioritized.map((p) =>
    db.task.update({
      where: { id: p.id },
      data: { priority: p.priority, order: p.order },
    })
  );
  await db.$transaction(updates);

  const updatedTasks = await db.task.findMany({
    where: { id: { in: prioritized.map((p) => p.id) } },
    include: { project: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(updatedTasks);
}
