'use client';

import * as React from "react";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HOUR_START = 8;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const TOTAL_MINS = (HOUR_END - HOUR_START) * 60;

interface GoogleEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface ScheduledBlock {
  id: string;
  startTime: string;
  endTime: string;
  task: {
    id: string;
    title: string;
    priority: string;
    project?: { name: string; color: string } | null;
  };
}

function timeToMinutes(iso: string): number {
  const d = parseISO(iso);
  return (d.getHours() - HOUR_START) * 60 + d.getMinutes();
}

function minutesToPct(mins: number): number {
  return Math.max(0, Math.min(100, (mins / TOTAL_MINS) * 100));
}

function durationPct(startIso: string, endIso: string): number {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const mins = (end.getTime() - start.getTime()) / 60000;
  return Math.max(1, (mins / TOTAL_MINS) * 100);
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-600/80 border-red-500",
  HIGH:   "bg-orange-600/80 border-orange-500",
  MEDIUM: "bg-indigo-600/80 border-indigo-500",
  LOW:    "bg-emerald-600/80 border-emerald-500",
};

export default function CalendarPage() {
  const [weekStart, setWeekStart] = React.useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [googleEvents, setGoogleEvents] = React.useState<GoogleEvent[]>([]);
  const [scheduledBlocks, setScheduledBlocks] = React.useState<ScheduledBlock[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [scheduling, setScheduling] = React.useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  async function fetchEvents() {
    setLoading(true);
    try {
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");
      const res = await fetch(
        `/api/calendar/events?startDate=${startStr}&endDate=${endStr}`
      );
      if (res.ok) {
        const data = await res.json();
        setGoogleEvents(data.googleEvents ?? []);
        setScheduledBlocks(data.scheduledBlocks ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { fetchEvents(); }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/calendar/sync", { method: "POST" });
      await fetchEvents();
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  }

  async function handleScheduleToday() {
    setScheduling(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      await fetch("/api/ai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      await fetchEvents();
    } catch {
      // ignore
    } finally {
      setScheduling(false);
    }
  }

  // Group blocks by day (YYYY-MM-DD)
  function blocksForDay(day: Date): ScheduledBlock[] {
    const dayStr = format(day, "yyyy-MM-dd");
    return scheduledBlocks.filter((b) => {
      const d = parseISO(b.startTime);
      return format(d, "yyyy-MM-dd") === dayStr;
    });
  }

  function googleEventsForDay(day: Date): GoogleEvent[] {
    const dayStr = format(day, "yyyy-MM-dd");
    return googleEvents.filter((e) => {
      const dt = e.start?.dateTime ?? e.start?.date;
      if (!dt) return false;
      try {
        return format(parseISO(dt), "yyyy-MM-dd") === dayStr;
      } catch {
        return false;
      }
    });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-100">Calendar</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setWeekStart((w) => subWeeks(w, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium text-zinc-300">
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync Google Calendar"}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleScheduleToday}
            disabled={scheduling}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {scheduling ? "Scheduling…" : "Schedule Today with AI"}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600/70" /> Google Calendar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600/80" /> Scheduled Task
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid border-b border-zinc-800" style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}>
            <div className="border-r border-zinc-800" />
            {weekDays.map((day) => {
              const isToday = format(day, "yyyy-MM-dd") === today;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-zinc-800 px-2 py-2.5 text-center last:border-r-0",
                    isToday && "bg-indigo-600/10"
                  )}
                >
                  <p className="text-xs font-medium text-zinc-500">{format(day, "EEE")}</p>
                  <p
                    className={cn(
                      "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold",
                      isToday
                        ? "bg-indigo-600 text-white"
                        : "text-zinc-300"
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid body */}
          <div className="relative" style={{ minHeight: `${TOTAL_MINS * 0.9}px` }}>
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top: `${((hour - HOUR_START) / (HOUR_END - HOUR_START)) * 100}%` }}
              >
                <div className="w-14 shrink-0 border-r border-zinc-800 pr-2 text-right text-[10px] text-zinc-600">
                  {hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`}
                </div>
                <div className="flex-1 border-b border-zinc-800/50" />
              </div>
            ))}

            {/* Day columns with events */}
            <div
              className="absolute inset-0 grid"
              style={{ gridTemplateColumns: "3.5rem repeat(7, 1fr)" }}
            >
              <div className="border-r border-zinc-800" />
              {weekDays.map((day) => {
                const isToday = format(day, "yyyy-MM-dd") === today;
                const dayBlocks = blocksForDay(day);
                const dayGoogleEvents = googleEventsForDay(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative border-r border-zinc-800 last:border-r-0",
                      isToday && "bg-indigo-600/5"
                    )}
                  >
                    {/* Google Calendar events */}
                    {dayGoogleEvents.map((event, idx) => {
                      const startDt = event.start?.dateTime;
                      const endDt = event.end?.dateTime;
                      if (!startDt || !endDt) return null;
                      const top = minutesToPct(timeToMinutes(startDt));
                      const height = durationPct(startDt, endDt);
                      return (
                        <div
                          key={idx}
                          className="absolute left-0.5 right-0.5 overflow-hidden rounded border border-blue-500/50 bg-blue-600/25 px-1 py-0.5"
                          style={{ top: `${top}%`, height: `${height}%` }}
                        >
                          <p className="truncate text-[9px] font-medium text-blue-300">
                            {event.summary ?? "Event"}
                          </p>
                        </div>
                      );
                    })}

                    {/* Scheduled task blocks */}
                    {dayBlocks.map((block) => {
                      const top = minutesToPct(timeToMinutes(block.startTime));
                      const height = durationPct(block.startTime, block.endTime);
                      const colorClass =
                        PRIORITY_COLORS[block.task.priority] ?? PRIORITY_COLORS.MEDIUM;
                      return (
                        <div
                          key={block.id}
                          className={cn(
                            "absolute left-0.5 right-0.5 overflow-hidden rounded border px-1 py-0.5",
                            colorClass
                          )}
                          style={{ top: `${top}%`, height: `${height}%` }}
                        >
                          <p className="truncate text-[9px] font-medium text-white">
                            {block.task.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <p className="text-center text-xs text-zinc-600">Loading events…</p>
      )}
    </div>
  );
}
