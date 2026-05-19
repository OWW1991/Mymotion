'use client';

import * as React from "react";
import { Sparkles, Trash2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ProjectWithCounts {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  aiSummary?: string | null;
  taskCount: number;
  doneCount: number;
}

interface ProjectCardProps {
  project: ProjectWithCounts;
  onGenerateTasks: (projectId: string) => Promise<void>;
  onGenerateSummary: (projectId: string) => Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export function ProjectCard({
  project,
  onGenerateTasks,
  onGenerateSummary,
  onDelete,
}: ProjectCardProps) {
  const [loadingTasks, setLoadingTasks] = React.useState(false);
  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const progressPct =
    project.taskCount > 0
      ? Math.round((project.doneCount / project.taskCount) * 100)
      : 0;

  async function handleGenerateTasks() {
    if (loadingTasks) return;
    setLoadingTasks(true);
    try {
      await onGenerateTasks(project.id);
    } finally {
      setLoadingTasks(false);
    }
  }

  async function handleGenerateSummary() {
    if (loadingSummary) return;
    setLoadingSummary(true);
    try {
      await onGenerateSummary(project.id);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await onDelete(project.id);
  }

  return (
    <Card className="group flex flex-col overflow-hidden transition-all hover:border-zinc-700">
      {/* Color stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: project.color }} />

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="truncate text-sm font-semibold text-zinc-100">
              {project.name}
            </h3>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 shrink-0 p-0 transition-colors",
              confirmDelete
                ? "text-red-400 hover:text-red-300"
                : "text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
            )}
            onClick={handleDelete}
            title={confirmDelete ? "Click again to confirm" : "Delete project"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Description */}
        {project.description && (
          <p className="line-clamp-2 text-xs text-zinc-500">{project.description}</p>
        )}

        {/* Task progress */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {project.doneCount} / {project.taskCount} tasks done
            </span>
            <span>{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-1" />
        </div>

        {/* AI Summary preview */}
        {project.aiSummary && (
          <div className="rounded-md border border-zinc-800 bg-zinc-800/40 p-2.5">
            <p className="line-clamp-3 text-xs text-zinc-400">{project.aiSummary}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={handleGenerateTasks}
            disabled={loadingTasks || loadingSummary}
          >
            {loadingTasks ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 text-indigo-400" />
            )}
            {loadingTasks ? "Generating…" : "Generate Tasks"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={handleGenerateSummary}
            disabled={loadingTasks || loadingSummary}
          >
            {loadingSummary ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileText className="h-3 w-3 text-indigo-400" />
            )}
            {loadingSummary ? "Generating…" : "Summary"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
