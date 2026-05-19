'use client';

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TaskFormData {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  projectId: string;
  estimatedMinutes: number;
  dueDate: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: TaskFormData) => Promise<void>;
  initialData?: Partial<TaskFormData>;
  projects?: Project[];
  title?: string;
}

const DEFAULT_FORM: TaskFormData = {
  title: "",
  description: "",
  priority: "MEDIUM",
  projectId: "",
  estimatedMinutes: 30,
  dueDate: "",
};

export function TaskDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  projects = [],
  title = "New Task",
}: TaskDialogProps) {
  const [form, setForm] = React.useState<TaskFormData>({ ...DEFAULT_FORM, ...initialData });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync form when initialData changes (e.g., editing a different task)
  React.useEffect(() => {
    setForm({ ...DEFAULT_FORM, ...initialData });
    setError(null);
  }, [initialData, open]);

  function set<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">
              Title <span className="text-red-400">*</span>
            </label>
            <Input
              placeholder="Task title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Description</label>
            <Textarea
              placeholder="Optional description…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Priority + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Priority</label>
              <Select
                value={form.priority}
                onValueChange={(v) => set("priority", v as TaskFormData["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Project</label>
              <Select
                value={form.projectId || "__none__"}
                onValueChange={(v) => set("projectId", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated minutes + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Estimated (minutes)
              </label>
              <Input
                type="number"
                min={1}
                value={form.estimatedMinutes}
                onChange={(e) => set("estimatedMinutes", Number(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Due Date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-900/30 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
