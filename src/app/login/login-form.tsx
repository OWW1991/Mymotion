'use client';

import * as React from "react";
import { signIn } from "next-auth/react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-sm">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/25">
          <Zap className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            MyMotion
          </h1>
          <p className="text-sm text-zinc-400">AI-powered task management</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-zinc-800" />

      {/* Sign-in */}
      <div className="flex w-full flex-col gap-4">
        <p className="text-center text-sm font-medium text-zinc-300">
          Sign in to your account
        </p>

        <Button
          variant="outline"
          size="lg"
          className="w-full gap-3 border-zinc-700 bg-white/5 text-zinc-100 hover:bg-white/10 hover:border-zinc-600"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              />
            </svg>
          )}
          {isLoading ? "Signing in..." : "Continue with Google"}
        </Button>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-zinc-600">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
