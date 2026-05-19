import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as
    | "TODO"
    | "IN_PROGRESS"
    | "DONE"
    | "CANCELLED"
    | null;
  const projectId = searchParams.get("projectId");
  const date = searchParams.get("date");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status) where.status = status;
  if (projectId) where.projectId = projectId;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.dueDate = { gte: start, lte: end };
  }

  const priorityOrder: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  const tasks = await db.task.findMany({
    where,
    include: { project: true },
    orderBy: [{ order: "asc" }, { dueDate: "asc" }],
  });

  // Secondary sort by priority in-memory
  tasks.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const pa = priorityOrder[a.priority] ?? 99;
    const pb = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    priority,
    estimatedMinutes,
    dueDate,
    projectId,
    labels,
  } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Get max order for this user
  const maxOrderTask = await db.task.findFirst({
    where: { userId: session.user.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (maxOrderTask?.order ?? -1) + 1;

  const task = await db.task.create({
    data: {
      title,
      description: description ?? null,
      priority: priority ?? "MEDIUM",
      estimatedMinutes: estimatedMinutes ?? 30,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: projectId ?? null,
      labels: labels ? (Array.isArray(labels) ? labels.join(",") : labels) : "",
      userId: session.user.id,
      order,
    },
    include: { project: true },
  });

  return NextResponse.json(task, { status: 201 });
}
