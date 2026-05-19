import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tasks } = body as { tasks: { id: string; order: number }[] };

  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: "tasks must be an array" }, { status: 400 });
  }

  // Verify all tasks belong to the current user
  const taskIds = tasks.map((t) => t.id);
  const existingTasks = await db.task.findMany({
    where: { id: { in: taskIds }, userId: session.user.id },
    select: { id: true },
  });
  const ownedIds = new Set(existingTasks.map((t) => t.id));

  const updates = tasks
    .filter((t) => ownedIds.has(t.id))
    .map((t) =>
      db.task.update({
        where: { id: t.id },
        data: { order: t.order },
      })
    );

  await db.$transaction(updates);

  return NextResponse.json({ success: true, updated: updates.length });
}
