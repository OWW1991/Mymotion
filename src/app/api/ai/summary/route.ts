import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateProjectSummary } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;


  const body = await req.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    include: { tasks: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = await db.userSettings.findUnique({
    where: { userId },
  });
  const ollamaConfig = { url: settings?.ollamaUrl, model: settings?.ollamaModel };

  const summary = await generateProjectSummary(project, project.tasks, ollamaConfig);

  await db.project.update({
    where: { id: projectId },
    data: { aiSummary: summary },
  });

  return NextResponse.json({ summary });
}
