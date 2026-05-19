import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;


  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const blocks = await db.scheduledBlock.findMany({
    where: {
      userId,
      date: { gte: todayStart, lte: todayEnd },
    },
    include: {
      task: {
        include: { project: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(blocks);
}
