'use client';

import * as React from "react";
import { Eye, EyeOff, Save, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

interface Settings {
  workStartHour: number;
  workEndHour: number;
  workDays: string;
  timezone: string;
  anthropicApiKey: string | null;
}

function hourToTime(hour: number): string {
  const h = String(hour).padStart(2, "0");
  return `${h}:00`;
}

function timeToHour(time: string): number {
  return parseInt(time.split(":")[0], 10);
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showApiKey, setShowApiKey] = React.useState(false);

  // Form state
  const [workStartHour, setWorkStartHour] = React.useState(9);
  const [workEndHour, setWorkEndHour] = React.useState(18);
  const [workDays, setWorkDays] = React.useState<number[]>([1, 2, 3, 4, 5]);
  const [timezone, setTimezone] = React.useState("UTC");
  const [apiKey, setApiKey] = React.useState("");

  React.useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data: Settings = await res.json();
          setSettings(data);
          setWorkStartHour(data.workStartHour);
          setWorkEndHour(data.workEndHour);
          setWorkDays(
            data.workDays
              .split(",")
              .map(Number)
              .filter((n) => !isNaN(n))
          );
          setTimezone(data.timezone);
          setApiKey(data.anthropicApiKey ?? "");
        }
      } catch {
        setError("Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workStartHour,
          workEndHour,
          workDays,
          timezone,
          anthropicApiKey: apiKey || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save Settings"}
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      {/* Work Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work Hours</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Start Time</label>
              <Input
                type="time"
                value={hourToTime(workStartHour)}
                onChange={(e) => setWorkStartHour(timeToHour(e.target.value))}
                className="[color-scheme:dark]"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">End Time</label>
              <Input
                type="time"
                value={hourToTime(workEndHour)}
                onChange={(e) => setWorkEndHour(timeToHour(e.target.value))}
                className="[color-scheme:dark]"
                disabled={loading}
              />
            </div>
          </div>

          {/* Work days */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400">Work Days</label>
            <div className="flex gap-2">
              {DAYS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => toggleDay(value)}
                  disabled={loading}
                  className={cn(
                    "flex h-8 w-10 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    workDays.includes(value)
                      ? "bg-indigo-600 text-white"
                      : "border border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-600"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="e.g. America/New_York"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={loading}
          />
          <p className="mt-1.5 text-xs text-zinc-600">
            Use IANA timezone names, e.g. America/New_York, Europe/London, Asia/Tokyo.
          </p>
        </CardContent>
      </Card>

      {/* Anthropic API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anthropic API Key</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="relative">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder="sk-ant-api03-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Used for AI task generation and scheduling. Leave blank to use the server-side key.
          </p>
        </CardContent>
      </Card>

      {/* Connected Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Account</CardTitle>
        </CardHeader>
        <CardContent>
          {session?.user ? (
            <div className="flex items-center gap-3">
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-200">{session.user.name}</p>
                <p className="text-xs text-zinc-500">{session.user.email}</p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Google
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Not signed in.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
