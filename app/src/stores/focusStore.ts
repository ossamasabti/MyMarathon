import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FocusMode } from '@/api/types';

/**
 * The focus session in progress on this device. Times are timestamps (ms), never a tick count,
 * so the session stays exact across screen changes, reloads, sleep and app restarts.
 */
export interface ActiveFocusSession {
  mode: FocusMode;
  taskId: number | null;
  taskTitle: string | null;
  /** Timer length; null for the stopwatch. */
  plannedMinutes: number | null;
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Total paused time so far. */
  pausedMs: number;
  /** Set once stopped (or when the timer ran out): the session waits to be saved or discarded. */
  endedAt: number | null;
}

export function focusedMs(session: ActiveFocusSession, now: number): number {
  const end = session.endedAt ?? session.pausedAt ?? now;
  return Math.max(0, end - session.startedAt - session.pausedMs);
}

export function timerMs(session: ActiveFocusSession): number | null {
  return session.plannedMinutes === null ? null : session.plannedMinutes * 60_000;
}

/** Moment a running timer reaches zero (null for a stopwatch or a paused/stopped session). */
export function timerEndsAt(session: ActiveFocusSession): number | null {
  const length = timerMs(session);
  if (length === null || session.pausedAt !== null || session.endedAt !== null) return null;
  return session.startedAt + session.pausedMs + length;
}

interface StartOptions {
  mode: FocusMode;
  taskId: number | null;
  taskTitle: string | null;
  plannedMinutes: number | null;
}

interface FocusState {
  session: ActiveFocusSession | null;
  start: (options: StartOptions) => void;
  pause: () => void;
  resume: () => void;
  /** Stop now, or at `at` (the exact moment a timer ran out). */
  stop: (at?: number) => void;
  clear: () => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      session: null,
      start: (options) =>
        set({ session: { ...options, startedAt: Date.now(), pausedAt: null, pausedMs: 0, endedAt: null } }),
      pause: () => {
        const { session } = get();
        if (!session || session.pausedAt !== null || session.endedAt !== null) return;
        set({ session: { ...session, pausedAt: Date.now() } });
      },
      resume: () => {
        const { session } = get();
        if (!session || session.pausedAt === null || session.endedAt !== null) return;
        set({ session: { ...session, pausedMs: session.pausedMs + Date.now() - session.pausedAt, pausedAt: null } });
      },
      stop: (at) => {
        const { session } = get();
        if (!session || session.endedAt !== null) return;
        // Stopping while paused ends the session when the pause began.
        const endedAt = session.pausedAt ?? at ?? Date.now();
        set({ session: { ...session, endedAt, pausedAt: null } });
      },
      clear: () => set({ session: null }),
    }),
    {
      name: 'mymarathon.focus',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ session }) => ({ session }),
    },
  ),
);

/** What the clock shows: time left for a timer, time focused for a stopwatch. */
export function focusClockMs(session: ActiveFocusSession, now: number): number {
  const length = timerMs(session);
  const focused = focusedMs(session, now);
  return length === null ? focused : Math.max(0, length - focused);
}
