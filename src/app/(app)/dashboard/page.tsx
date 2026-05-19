'use client';

import * as React from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  ListTodo,
  Sparkles,
  Plus,
  CalendarClock,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types
interface Task {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  project?: { name: string };
}

interface TimeBlock {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: "task" | "break" | "meeting";
  taskId?: string;
}

interface DashboardStats {
  dueToday: number;
  completedToday: number;
  inProgress: number;
}

// Skeleton loader
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-800/60",
        className
      )}
    />
  );
}

// Stat card
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          {loading ? (
            <>
              <Skeleton className="mb-1 h-6 w-8" />
              <Skeleton className="h-3.5 w-20" />
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-zinc-100">{value}</span>
              <span className="text-xs text-zinc-500">{label}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  DONE: CheckCircle2,
  CANCELLED: Circle,
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  const [stats, setStats] = React.useState<DashboardStats>({
    dueToday: 0,
    completedToday: 0,
    inProgress: 0,
  });
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [schedule, setSchedule] = React.useState<TimeBlock[]>([]);
  const [loadingTasks, setLoadingTasks] = React.useState(true);
  const [loadingSchedule, setLoadingSchedule] = React.useState(true);

  // Fetch tasks
  React.useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks?limit=5&sort=updatedAt");
        if (res.ok) {
          const data = await res.json();
          const taskList: Task[] = data.tasks ?? data ?? [];
          setTasks(taskList.slice(0, 5));

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const dueToday = taskList.filter((t) => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            return d >= today && d < tomorrow;
          }).length;

          const completedToday = taskList.filter((t) => t.status === "DONE").length;
          const inProgress = taskList.filter((t) => t.status === "IN_PROGRESS").length;

          setStats({ dueToday, completedToday, inProgress });
        }
      } catch {
        // ignore
      } finally {
        setLoadingTasks(false);
      }
    }
    fetchTasks();
  }, []);

  // Fetch today's schedule
  React.useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/schedule/today");
        if (res.ok) {
          const data = await res.json();
          setSchedule(data.blocks ?? data ?? []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingSchedule(false);
      }
    }
    fetchSchedule();
  }, []);

  const todayFormatted = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome heading */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">
            Good morning, {firstName}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">{todayFormatted}</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Due Today"
          value={stats.dueToday}
          icon={ListTodo}
          color="bg-indigo-600/20 text-indigo-400"
          loading={loadingTasks}
        />
        <StatCard
          label="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle2}
          color="bg-emerald-600/20 text-emerald-400"
          loading={loadingTasks}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon={Clock}
          color="bg-amber-600/20 text-amber-400"
          loading={loadingTasks}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* AI Schedule panel — 3/5 width */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-indigo-400" />
              Today&apos;s Schedule
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Regenerate
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSchedule ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-14 w-16 shrink-0" />
                    <Skeleton className="h-14 flex-1" />
                  </div>
                ))}
              </div>
            ) : schedule.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-300">No schedule yet</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Let AI plan your day based on your tasks and priorities.
                  </p>
                </div>
                <Button size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Schedule My Day
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {schedule.map((block) => (
                  <div
                    key={block.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                      block.type === "break"
                        ? "border-zinc-800 bg-zinc-800/30 opacity-60"
                        : "border-zinc-800 bg-zinc-800/50 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex w-14 shrink-0 flex-col items-center text-center">
                      <span className="text-xs font-medium text-indigo-400">
                        {block.startTime}
                      </span>
                      <div className="my-1 h-3 w-px bg-zinc-700" />
                      <span className="text-xs text-zinc-600">
                        {block.endTime}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {block.title}
                      </p>
                      <Badge
                        variant={block.type === "break" ? "secondary" : "default"}
                        className="mt-1 capitalize text-xs"
                      >
                        {block.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent tasks — 2/5 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Tasks</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-zinc-400">
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
                  <ListTodo className="h-5 w-5 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    No tasks yet
                  </p>
                  <p className="text-xs text-zinc-600">
                    Add your first task to get started.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {tasks.map((task) => {
                  const StatusIcon = STATUS_ICONS[task.status] ?? Circle;
                  const isDone = task.status === "DONE";
                  return (
                    <div
                      key={task.id}
                      className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-zinc-800/50"
                    >
                      <StatusIcon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          isDone
                            ? "text-emerald-500"
                            : task.status === "IN_PROGRESS"
                            ? "text-amber-500"
                            : "text-zinc-600"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isDone
                              ? "text-zinc-500 line-through"
                              : "text-zinc-200"
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          {task.project && (
                            <span className="truncate text-xs text-zinc-600">
                              {task.project.name}
                            </span>
                          )}
                          <Badge
                            variant={
                              (PRIORITY_COLORS[task.priority] as
                                | "default"
                                | "destructive"
                                | "secondary"
                                | "outline") ?? "outline"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
