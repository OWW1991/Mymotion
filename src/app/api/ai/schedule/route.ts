import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDaySchedule } from "@/lib/ai";
import { getEvents, createEvent, updateEvent } from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date } = body as { date: string };

  if (!date) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Get user settings
  const settings = await db.userSettings.findUnique({
    where: { userId: session.user.id },
  });
  const workStartHour = settings?.workStartHour ?? 9;
  const workEndHour = settings?.workEndHour ?? 18;
  const timezone = settings?.timezone ?? "UTC";
  const apiKey = settings?.anthropicApiKey ?? undefined;

  // Get user's pending tasks
  const tasks = await db.task.findMany({
    where: {
      userId: session.user.id,
      status: { in: ["TODO", "IN_PROGRESS"] },
      estimatedMinutes: { gt: 0 },
    },
    orderBy: { order: "asc" },
  });

  // Get Google access token
  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  let googleEvents: Array<{ title: string; startTime: string; endTime: string }> = [];

  if (account?.access_token) {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    try {
      const calendarId = account.googleCalendarId ?? "primary";
      const events = await getEvents(account.access_token, calendarId, dayStart, dayEnd);
      googleEvents = events
        .filter((e) => e.start?.dateTime && e.end?.dateTime)
        .map((e) => ({
          title: e.summary ?? "Busy",
          startTime: e.start!.dateTime!,
          endTime: e.end!.dateTime!,
        }));
    } catch {
      // Continue without calendar events if fetch fails
    }
  }

  // Generate schedule with AI
  const blocks = await generateDaySchedule(
    tasks,
    googleEvents,
    workStartHour,
    workEndHour,
    date,
    apiKey
  );

  // Save ScheduledBlocks to DB (delete old ones for this date first)
  const dateStart = new Date(`${date}T00:00:00.000Z`);
  const dateEnd = new Date(`${date}T23:59:59.999Z`);
  await db.scheduledBlock.deleteMany({
    where: {
      userId: session.user.id,
      date: { gte: dateStart, lte: dateEnd },
    },
  });

  const calendarId = account?.googleCalendarId ?? "primary";

  const savedBlocks = await Promise.all(
    blocks.map(async (block) => {
      let googleEventId: string | null = null;

      // Push to Google Calendar if we have an access token
      if (account?.access_token) {
        const task = tasks.find((t) => t.id === block.taskId);
        const event = {
          summary: task?.title ?? "Scheduled Task",
          start: { dateTime: block.startTime, timeZone: timezone },
          end: { dateTime: block.endTime, timeZone: timezone },
          colorId: "9",
        };
        try {
          const id = await createEvent(account.access_token, calendarId, event);
          googleEventId = id;
        } catch {
          // Ignore calendar errors
        }
      }

      return db.scheduledBlock.create({
        data: {
          taskId: block.taskId,
          userId: session.user.id,
          startTime: new Date(block.startTime),
          endTime: new Date(block.endTime),
          date: new Date(`${block.date}T00:00:00.000Z`),
          googleEventId,
        },
      });
    })
  );

  const savedWithTasks = await db.scheduledBlock.findMany({
    where: { id: { in: savedBlocks.map((b) => b.id) } },
    include: { task: { include: { project: true } } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(savedWithTasks);
}
