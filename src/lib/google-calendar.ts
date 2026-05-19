import { google } from "googleapis";
import { db } from "@/lib/db";
import { addDays, startOfDay, endOfDay, parseISO } from "date-fns";

export function getGoogleCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export interface GoogleCalendarEvent {
  summary?: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  colorId?: string;
}

export async function getEvents(
  accessToken: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = getGoogleCalendarClient(accessToken);

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });

  return response.data.items ?? [];
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent
): Promise<string | null> {
  const calendar = getGoogleCalendarClient(accessToken);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id ?? null;
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleCalendarEvent>
): Promise<void> {
  const calendar = getGoogleCalendarClient(accessToken);

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: event,
  });
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = getGoogleCalendarClient(accessToken);

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function syncCalendarToDb(
  userId: string,
  accessToken: string
): Promise<void> {
  const calendar = getGoogleCalendarClient(accessToken);

  // Get the primary calendar
  const calendarListResponse = await calendar.calendarList.get({
    calendarId: "primary",
  });

  const calendarId = calendarListResponse.data.id ?? "primary";
  const now = new Date();
  const twoWeeksFromNow = addDays(now, 14);

  // Fetch events from primary calendar for the next 14 days
  const events = await getEvents(accessToken, calendarId, now, twoWeeksFromNow);

  for (const event of events) {
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    if (!event.id) continue;

    const startTime = parseISO(event.start.dateTime);
    const endTime = parseISO(event.end.dateTime);
    const date = startOfDay(startTime);

    // Check if there's a task associated with this Google event
    const task = await db.task.findFirst({
      where: {
        userId,
        googleEventId: event.id,
      },
    });

    if (task) {
      // Upsert ScheduledBlock for this event
      const existingBlock = await db.scheduledBlock.findFirst({
        where: {
          taskId: task.id,
          googleEventId: event.id,
        },
      });

      if (existingBlock) {
        await db.scheduledBlock.update({
          where: { id: existingBlock.id },
          data: { startTime, endTime, date },
        });
      } else {
        await db.scheduledBlock.create({
          data: {
            taskId: task.id,
            userId,
            startTime,
            endTime,
            date,
            googleEventId: event.id,
          },
        });
      }
    }
  }

  // Update account with calendarId if not set
  await db.account.updateMany({
    where: {
      userId,
      provider: "google",
      googleCalendarId: null,
    },
    data: {
      googleCalendarId: calendarId,
    },
  });
}

export async function pushTaskToCalendar(
  task: {
    id: string;
    title: string;
    description?: string | null;
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
    googleEventId?: string | null;
  },
  accessToken: string,
  calendarId: string = "primary",
  timezone: string = "UTC"
): Promise<string | null> {
  if (!task.scheduledStart || !task.scheduledEnd) return null;

  const event: GoogleCalendarEvent = {
    summary: task.title,
    description: task.description ?? undefined,
    start: {
      dateTime: task.scheduledStart.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: task.scheduledEnd.toISOString(),
      timeZone: timezone,
    },
    colorId: "9", // Blueberry color for scheduled tasks
  };

  if (task.googleEventId) {
    // Update existing event
    await updateEvent(accessToken, calendarId, task.googleEventId, event);
    return task.googleEventId;
  } else {
    // Create new event
    const eventId = await createEvent(accessToken, calendarId, event);
    return eventId;
  }
}
