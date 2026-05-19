import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncCalendarToDb } from "@/lib/google-calendar";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;


  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    return NextResponse.json(
      { error: "No Google account connected or access token missing" },
      { status: 400 }
    );
  }

  await syncCalendarToDb(userId, account.access_token);

  const synced = await db.scheduledBlock.count({
    where: { userId },
  });

  return NextResponse.json({ synced });
}
