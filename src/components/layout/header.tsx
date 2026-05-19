'use client';

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { format } from "date-fns";
import { Bell, Sparkles, ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/today": "Today",
  "/tasks": "Tasks",
  "/projects": "Projects",
  "/calendar": "Calendar",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Prefix match
  for (const [key, value] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return value;
  }
  return "MyMotion";
}

interface HeaderProps {
  onScheduleDay?: () => void;
}

export function Header({ onScheduleDay }: HeaderProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const today = new Date();
  const dateString = format(today, "EEEE, MMMM d");
  const pageTitle = getPageTitle(pathname);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-6 backdrop-blur-sm">
      {/* Left: page title + date */}
      <div className="flex flex-col justify-center">
        <h1 className="text-base font-semibold text-zinc-100">{pageTitle}</h1>
        <p className="text-xs text-zinc-500">{dateString}</p>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Schedule My Day */}
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={onScheduleDay}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Schedule My Day
        </Button>

        {/* Notification Bell */}
        <button
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400",
            "transition-colors hover:bg-zinc-800 hover:text-zinc-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {/* Unread dot */}
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5",
                "text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              )}
            >
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "User"}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-700"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-semibold text-indigo-300">
                  {initials}
                </div>
              )}
              <span className="hidden text-sm font-medium sm:block">
                {user?.name?.split(" ")[0] ?? "Account"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-zinc-100">
                  {user?.name ?? "User"}
                </span>
                <span className="text-xs font-normal text-zinc-500">
                  {user?.email ?? ""}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 focus:text-red-300"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
