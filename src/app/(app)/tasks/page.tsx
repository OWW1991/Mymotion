'use client';

import * as React from "react";
import { Plus, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskCard, TaskWithProject } from "@/components/tasks/task-card";
import { TaskDialog, TaskFormData } from "@/components/tasks/task-dialog";
import { cn } from "@/lib/utils";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface Project {
  id: string;
  name: string;
  color: string;
}

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "TODO",        label: "To Do",      color: "text-zinc-400" },
  { status: "IN_PROGRESS", label: "In Progress", color: "text-amber-400" },
  { status: "DONE",        label: "Done",        color: "text-emerald-400" },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-800/60", className)} />;
}

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<TaskWithProject[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [prioritizing, setPrioritizing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = React.useState<string>("__all__");
  const [filterPriority, setFilterPriority] = React.useState<string>("__all__");

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskWithProject | null>(null);

  // Fetch tasks and projects
  async function fetchData() {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/projects"),
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch {
      setError("Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchData(); }, []);

  // Filter tasks
  const filtered = tasks.filter((t) => {
    if (filterProject !== "__all__" && t.projectId !== filterProject) return false;
    if (filterPriority !== "__all__" && t.priority !== filterPriority) return false;
    return true;
  });

  // Group by status
  const byStatus = (status: TaskStatus) =>
    filtered.filter((t) => t.status === status);

  async function handleCreate(data: TaskFormData) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        projectId: data.projectId || undefined,
        estimatedMinutes: data.estimatedMinutes,
        dueDate: data.dueDate || undefined,
      }),
    });
    if (!res.ok) throw new Error("Failed to create task");
    await fetchData();
  }

  async function handleEdit(data: TaskFormData) {
    if (!editingTask) return;
    const res = await fetch(`/api/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        projectId: data.projectId || null,
        estimatedMinutes: data.estimatedMinutes,
        dueDate: data.dueDate || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    await fetchData();
  }

  async function handleUpdate(id: string, patch: Partial<TaskWithProject>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function openCreate() {
    setEditingTask(null);
    setDialogOpen(true);
  }

  function openEdit(task: TaskWithProject) {
    setEditingTask(task);
    setDialogOpen(true);
  }

  async function handlePrioritize() {
    setPrioritizing(true);
    try {
      const res = await fetch("/api/ai/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filterProject !== "__all__" ? { projectId: filterProject } : {}),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      // ignore
    } finally {
      setPrioritizing(false);
    }
  }

  const editInitial: Partial<TaskFormData> | undefined = editingTask
    ? {
        title: editingTask.title,
        description: editingTask.description ?? "",
        priority: editingTask.priority,
        projectId: editingTask.projectId ?? "",
        estimatedMinutes: editingTask.estimatedMinutes,
        dueDate: editingTask.dueDate
          ? new Date(editingTask.dueDate).toISOString().slice(0, 10)
          : "",
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-100">Tasks</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handlePrioritize}
            disabled={prioritizing}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            {prioritizing ? "Prioritizing…" : "Prioritize with AI"}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-500" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {/* Kanban board */}
      <div className="grid min-h-[60vh] grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map(({ status, label, color }) => {
          const columnTasks = byStatus(status);
          return (
            <div
              key={status}
              className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-1 pb-1">
                <span className={cn("text-sm font-semibold", color)}>{label}</span>
                <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1.5 text-xs">
                  {loading ? "…" : columnTasks.length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {loading ? (
                  <>
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-800 py-8 text-xs text-zinc-600">
                    No tasks
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onEdit={openEdit}
                    />
                  ))
                )}
              </div>

              {/* Add task quick button on To Do column */}
              {status === "TODO" && (
                <button
                  onClick={openCreate}
                  className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Task dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        onSave={editingTask ? handleEdit : handleCreate}
        initialData={editInitial}
        projects={projects}
        title={editingTask ? "Edit Task" : "New Task"}
      />
    </div>
  );
}
