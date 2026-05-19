'use client';

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectCard, ProjectWithCounts } from "@/components/projects/project-card";
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-zinc-800/60", className)} />;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4",
];

interface NewProjectForm {
  name: string;
  description: string;
  color: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<NewProjectForm>({
    name: "",
    description: "",
    color: "#6366f1",
  });
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchProjects(); }, []);

  async function handleCreate() {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          color: form.color,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      setDialogOpen(false);
      setForm({ name: "", description: "", color: "#6366f1" });
      await fetchProjects();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateTasks(projectId: string) {
    const project = projects.find((p) => p.id === projectId);
    const res = await fetch("/api/ai/generate-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        description: project?.description ?? "",
      }),
    });
    if (!res.ok) throw new Error("Failed to generate tasks");
    await fetchProjects();
  }

  async function handleGenerateSummary(projectId: string) {
    const res = await fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (!res.ok) throw new Error("Failed to generate summary");
    const data = await res.json();
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, aiSummary: data.summary } : p))
    );
  }

  async function handleDelete(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete project");
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Projects</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <p className="text-sm text-zinc-500">No projects yet.</p>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onGenerateTasks={handleGenerateTasks}
              onGenerateSummary={handleGenerateSummary}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* New project dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setFormError(null); setForm({ name: "", description: "", color: "#6366f1" }); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Description</label>
              <Textarea
                placeholder="What is this project about?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      form.color === c
                        ? "border-white scale-110"
                        : "border-transparent opacity-70 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {formError && (
              <p className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
