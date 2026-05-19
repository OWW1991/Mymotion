'use client';

import * as React from "react";

export type ToastVariant = "default" | "destructive" | "success";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; id: string }
  | { type: "REMOVE_TOAST"; id: string };

interface ToastState {
  toasts: Toast[];
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 300; // ms after dismiss before removal

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, open: false } : t
        ),
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
}

// Global state outside React so toast() can be called anywhere
let memoryState: ToastState = { toasts: [] };
const listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

let toastCount = 0;

function generateId(): string {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${toastCount}`;
}

function scheduleRemoval(id: string, duration: number) {
  if (toastTimeouts.has(id)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(id);
    dispatch({ type: "REMOVE_TOAST", id });
  }, duration + TOAST_REMOVE_DELAY);
  toastTimeouts.set(id, timeout);
}

export type ToastInput = Omit<Toast, "id">;

export function toast(input: ToastInput) {
  const id = generateId();
  const duration = input.duration ?? 5000;

  dispatch({
    type: "ADD_TOAST",
    toast: { ...input, id, duration },
  });

  setTimeout(() => {
    dispatch({ type: "DISMISS_TOAST", id });
    scheduleRemoval(id, TOAST_REMOVE_DELAY);
  }, duration);

  return {
    id,
    dismiss: () => {
      dispatch({ type: "DISMISS_TOAST", id });
      scheduleRemoval(id, TOAST_REMOVE_DELAY);
    },
  };
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss: (id: string) => {
      dispatch({ type: "DISMISS_TOAST", id });
      scheduleRemoval(id, TOAST_REMOVE_DELAY);
    },
  };
}
