'use client';

import * as React from "react";
import { format } from "date-fns";
import { Clock, Edit2, GripVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface TaskWithProject {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes: number;
  dueDate?: string | null;
  completedAt?: string | null;
  projectId?: string | null;
  project?: { id: string; name: string; color: string } | null;
  labels?: string;
  order: number;
}

interface TaskCardProps {
  task: TaskWithProject;
  onUpdate: (id: string, data: Partial<TaskWithProject>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (task: TaskWithProject) => void;
}

const PRIORITY_BADGE: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "Urgent", className: "bg-red-600/20 text-red-400 border-red-600/30" },
  HIGH:   { label: "High",   className: "bg-orange-600/20 text-orange-400 border-orange-600/30" },
  MEDIUM: { label: "Medium", className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" },
  LOW:    { label: "Low",    className: "bg-green-600/20 text-green-400 border-green-600/30" },
};

export function TaskCard({ task, onUpdate, onDelete, onEdit }: TaskCardProps) {
  const [deleting, setDeleting] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  const isDone = task.status === "DONE";
  const priority = PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.MEDIUM;

  async function handleToggleDone(checked: boolean) {
    if (toggling) return;
    setToggling(true);
    try {
      await onUpdate(task.id, {
        status: checked ? "DONE" : "TODO",
        completedAt: checked ? new Date().toISOString() : null,
      });
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 transition-all",
        "hover:border-zinc-700 hover:shadow-sm",
        isDone && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <div className="mt-0.5 cursor-grab text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Checkbox */}
      <div className="mt-0.5 shrink-0">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleToggleDone}
          disabled={toggling}
          className="h-4 w-4"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Title */}
        <button
          onClick={() => onEdit(task)}
          className={cn(
            "w-full text-left text-sm font-medium text-zinc-200 transition-colors hover:text-zinc-100",
            isDone && "line-through text-zinc-500"
          )}
        >
          {task.title}
        </button>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Priority badge */}
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
              priority.className
            )}
          >
            {priority.label}
          </span>

          {/* Project badge */}
          {task.project && (
            <span
              className="inline-flex items-center gap-1 rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              {task.project.name}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          )}

          {/* Estimated time */}
          {task.estimatedMinutes > 0 && (
            <span className="text-[10px] text-zinc-600">
              ~{task.estimatedMinutes}m
            </span>
          )}
        </div>
      </div>

      {/* Hover action buttons */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
          onClick={() => onEdit(task)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
