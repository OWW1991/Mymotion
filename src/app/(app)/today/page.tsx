'use client';

import * as React from "react";
import { format, parseISO } from "date-fns";
import { Sparkles, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskBlock {
  id: string;
  startTime: string;
  endTime: string;
  task: {
    id: string;
    title: string;
    priority: string;
    status: string;
    estimatedMinutes: number;
    project?: { name: string; color: string } | null;
  };
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "border-l-red-500 bg-red-600/10",
  HIGH:   "border-l-orange-500 bg-orange-600/10",
  MEDIUM: "border-l-indigo-500 bg-indigo-600/10",
  LOW:    "border-l-emerald-500 bg-emerald-600/10",
};

const PRIORITY_BADGES: Record<string, string> = {
  URGENT: "bg-red-600/20 text-red-400",
  HIGH:   "bg-orange-600/20 text-orange-400",
  MEDIUM: "bg-indigo-600/20 text-indigo-400",
  LOW:    "bg-emerald-600/20 text-emerald-400",
};

const DAY_MESSAGES: Record<string, string> = {
  Monday:    "Start the week strong. You've got this!",
  Tuesday:   "Building momentum — keep it up!",
  Wednesday: "Halfway there. Stay focused!",
  Thursday:  "Almost Friday. Push through!",
  Friday:    "Final stretch of the week. Finish strong!",
  Saturday:  "Weekend mode — but greatness doesn't rest.",
  Sunday:    "Prepare for an amazing week ahead.",
};

export default function TodayPage() {
  const [blocks, setBlocks] = React.useState<TaskBlock[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [scheduling, setScheduling] = React.useState(false);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  const today = new Date();
  const todayFormatted = format(today, "EEEE, MMMM d");
  const dayName = format(today, "EEEE");
  const motivational = DAY_MESSAGES[dayName] ?? "Make today count!";

  async function fetchBlocks() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule/today");
      if (res.ok) setBlocks(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchBlocks(); }, []);

  async function handleSchedule() {
    setScheduling(true);
    try {
      const dateStr = format(today, "yyyy-MM-dd");
      const res = await fetch("/api/ai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });
      if (res.ok) setBlocks(await res.json());
    } catch {
      // ignore
    } finally {
      setScheduling(false);
    }
  }

  async function handleComplete(block: TaskBlock) {
    if (completingId) return;
    const isDone = block.task.status === "DONE";
    setCompletingId(block.id);
    try {
      const res = await fetch(`/api/tasks/${block.task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: isDone ? "TODO" : "DONE",
          completedAt: isDone ? null : new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id
              ? { ...b, task: { ...b.task, status: isDone ? "TODO" : "DONE" } }
              : b
          )
        );
      }
    } finally {
      setCompletingId(null);
    }
  }

  const doneCount = blocks.filter((b) => b.task.status === "DONE").length;
  const totalCount = blocks.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  function blockDuration(block: TaskBlock): number {
    const start = parseISO(block.startTime);
    const end = parseISO(block.endTime);
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Date & greeting */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">
          Today
        </p>
        <h1 className="mt-1 text-3xl font-bold text-zinc-50">{todayFormatted}</h1>
        <p className="mt-1 text-sm text-zinc-500">{motivational}</p>
      </div>

      {/* Progress */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {allDone ? "All done! Great work!" : `${doneCount} of ${totalCount} tasks completed`}
              </span>
              <span className="text-xs text-zinc-600">
                {totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  allDone ? "bg-emerald-500" : "bg-indigo-500"
                )}
                style={{
                  width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 w-full animate-pulse rounded-xl bg-zinc-800/60"
            />
          ))}
        </div>
      )}

      {/* Empty state / Schedule button */}
      {!loading && totalCount === 0 && (
        <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20">
            <Sparkles className="h-7 w-7 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-200">No schedule yet</h2>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Let AI analyze your tasks and build an optimized schedule for today.
            </p>
          </div>
          <Button
            size="lg"
            className="gap-2 px-8"
            onClick={handleSchedule}
            disabled={scheduling}
          >
            <Sparkles className="h-5 w-5" />
            {scheduling ? "Scheduling…" : "Schedule My Day"}
          </Button>
        </div>
      )}

      {/* Timeline */}
      {!loading && totalCount > 0 && (
        <>
          <div className="flex flex-col gap-0">
            {blocks.map((block, idx) => {
              const isDone = block.task.status === "DONE";
              const colorClass = PRIORITY_COLORS[block.task.priority] ?? PRIORITY_COLORS.MEDIUM;
              const badgeClass = PRIORITY_BADGES[block.task.priority] ?? PRIORITY_BADGES.MEDIUM;
              const duration = blockDuration(block);
              const isLast = idx === blocks.length - 1;

              return (
                <div key={block.id} className="flex gap-4">
                  {/* Time column */}
                  <div className="flex w-14 shrink-0 flex-col items-center">
                    <span className="text-xs font-medium text-zinc-400">
                      {format(parseISO(block.startTime), "h:mm")}
                      <span className="text-[10px] text-zinc-600">
                        {format(parseISO(block.startTime), "a")}
                      </span>
                    </span>
                    {!isLast && (
                      <div className="my-1 flex-1 w-px bg-zinc-800" style={{ minHeight: "1.5rem" }} />
                    )}
                  </div>

                  {/* Block card */}
                  <div
                    className={cn(
                      "mb-3 flex-1 rounded-xl border-l-2 p-3 transition-all",
                      colorClass,
                      "border border-zinc-800",
                      isDone && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium text-zinc-200",
                            isDone && "line-through text-zinc-500"
                          )}
                        >
                          {block.task.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                              badgeClass
                            )}
                          >
                            {block.task.priority}
                          </span>
                          {block.task.project && (
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: block.task.project.color }}
                              />
                              {block.task.project.name}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 text-[10px] text-zinc-600">
                            <Clock className="h-2.5 w-2.5" />
                            {duration}m
                          </span>
                        </div>
                      </div>

                      {/* Complete button */}
                      <button
                        onClick={() => handleComplete(block)}
                        disabled={completingId === block.id}
                        className="shrink-0 text-zinc-600 transition-colors hover:text-zinc-300"
                        title={isDone ? "Mark incomplete" : "Mark complete"}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Re-schedule button */}
          <Button
            variant="outline"
            className="gap-2 self-start"
            onClick={handleSchedule}
            disabled={scheduling}
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            {scheduling ? "Rescheduling…" : "Reschedule Day"}
          </Button>
        </>
      )}
    </div>
  );
}
