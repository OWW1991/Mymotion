import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const settings = await db.userSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      workStartHour: 9,
      workEndHour: 18,
      workDays: "1,2,3,4,5",
      timezone: "UTC",
      ollamaUrl: "http://localhost:11434",
      ollamaModel: "llama3.2",
    },
  });

  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  const body = await req.json();
  const { workStartHour, workEndHour, workDays, timezone, ollamaUrl, ollamaModel } = body;

  const data: Record<string, unknown> = {};
  if (workStartHour !== undefined) data.workStartHour = Number(workStartHour);
  if (workEndHour !== undefined) data.workEndHour = Number(workEndHour);
  if (workDays !== undefined)
    data.workDays = Array.isArray(workDays) ? workDays.join(",") : workDays;
  if (timezone !== undefined) data.timezone = timezone;
  if (ollamaUrl !== undefined) data.ollamaUrl = ollamaUrl;
  if (ollamaModel !== undefined) data.ollamaModel = ollamaModel;

  const settings = await db.userSettings.upsert({
    where: { userId },
    update: data,
    create: {
      userId,
      workStartHour: workStartHour ?? 9,
      workEndHour: workEndHour ?? 18,
      workDays: workDays
        ? Array.isArray(workDays)
          ? workDays.join(",")
          : workDays
        : "1,2,3,4,5",
      timezone: timezone ?? "UTC",
      ollamaUrl: ollamaUrl ?? "http://localhost:11434",
      ollamaModel: ollamaModel ?? "llama3.2",
    },
  });

  return NextResponse.json(settings);
}
