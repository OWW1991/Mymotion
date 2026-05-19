import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEvents } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  // Get Google Calendar events
  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  let googleEvents: unknown[] = [];

  if (account?.access_token) {
    try {
      const calendarId = account.googleCalendarId ?? "primary";
      googleEvents = await getEvents(account.access_token, calendarId, start, end);
    } catch {
      // Return empty if calendar fetch fails
    }
  }

  // Get ScheduledBlocks from DB for the range
  const scheduledBlocks = await db.scheduledBlock.findMany({
    where: {
      userId: session.user.id,
      startTime: { gte: start, lte: end },
    },
    include: {
      task: {
        include: { project: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ googleEvents, scheduledBlocks });
}
