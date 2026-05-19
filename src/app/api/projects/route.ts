import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;


  const projects = await db.project.findMany({
    where: { userId },
    include: {
      tasks: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = projects.map((p) => ({
    ...p,
    taskCount: p.tasks.length,
    doneCount: p.tasks.filter((t) => t.status === "DONE").length,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;


  const body = await req.json();
  const { name, description, color } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await db.project.create({
    data: {
      name,
      description: description ?? null,
      color: color ?? "#6366f1",
      userId,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
