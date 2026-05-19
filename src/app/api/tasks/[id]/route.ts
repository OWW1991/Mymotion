import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteEvent } from "@/lib/google-calendar";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await db.task.findFirst({
    where: { id, userId: session.user.id },
    include: { project: true, scheduledBlocks: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.task.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = [
    "title",
    "description",
    "priority",
    "status",
    "estimatedMinutes",
    "dueDate",
    "projectId",
    "order",
    "completedAt",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      if (field === "dueDate" || field === "completedAt") {
        data[field] = body[field] ? new Date(body[field]) : null;
      } else {
        data[field] = body[field];
      }
    }
  }

  // Auto-set completedAt when marking DONE
  if (body.status === "DONE" && !data.completedAt) {
    data.completedAt = new Date();
  }
  if (body.status && body.status !== "DONE" && !("completedAt" in body)) {
    data.completedAt = null;
  }

  const task = await db.task.update({
    where: { id },
    data,
    include: { project: true },
  });

  return NextResponse.json(task);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await db.task.findFirst({
    where: { id, userId: session.user.id },
    include: { scheduledBlocks: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Delete Google Calendar events for scheduled blocks
  if (task.scheduledBlocks.length > 0) {
    const account = await db.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
    });
    if (account?.access_token) {
      const calendarId = account.googleCalendarId ?? "primary";
      for (const block of task.scheduledBlocks) {
        if (block.googleEventId) {
          try {
            await deleteEvent(account.access_token, calendarId, block.googleEventId);
          } catch {
            // Ignore errors from calendar deletion
          }
        }
      }
    }
  }

  // Delete Google Calendar event attached to the task itself
  if (task.googleEventId) {
    const account = await db.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
    });
    if (account?.access_token) {
      try {
        await deleteEvent(
          account.access_token,
          account.googleCalendarId ?? "primary",
          task.googleEventId
        );
      } catch {
        // Ignore errors
      }
    }
  }

  // Delete scheduled blocks then task (cascade should handle it, but be explicit)
  await db.scheduledBlock.deleteMany({ where: { taskId: id } });
  await db.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
