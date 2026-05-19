import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncCalendarToDb } from "@/lib/google-calendar";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "No Google account connected or access token missing" },
      { status: 400 }
    );
  }

  await syncCalendarToDb(session.user.id, account.access_token);

  const synced = await db.scheduledBlock.count({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ synced });
}
