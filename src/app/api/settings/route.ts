import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: {
      userId: session.user.id,
      workStartHour: 9,
      workEndHour: 18,
      workDays: "1,2,3,4,5",
      timezone: "UTC",
    },
  });

  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { workStartHour, workEndHour, workDays, timezone, anthropicApiKey } = body;

  const data: Record<string, unknown> = {};
  if (workStartHour !== undefined) data.workStartHour = Number(workStartHour);
  if (workEndHour !== undefined) data.workEndHour = Number(workEndHour);
  if (workDays !== undefined)
    data.workDays = Array.isArray(workDays) ? workDays.join(",") : workDays;
  if (timezone !== undefined) data.timezone = timezone;
  if (anthropicApiKey !== undefined) data.anthropicApiKey = anthropicApiKey;

  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: {
      userId: session.user.id,
      workStartHour: workStartHour ?? 9,
      workEndHour: workEndHour ?? 18,
      workDays: workDays
        ? Array.isArray(workDays)
          ? workDays.join(",")
          : workDays
        : "1,2,3,4,5",
      timezone: timezone ?? "UTC",
      anthropicApiKey: anthropicApiKey ?? null,
    },
  });

  return NextResponse.json(settings);
}
