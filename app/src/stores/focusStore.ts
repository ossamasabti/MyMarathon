import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { FocusMode } from '@/api/types';
import { breakAfter, CYCLE_METHODS, type BreakKind, type CycleMethodKey } from '@/lib/focusMethods';

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
  /** Set once stopped (or when the timer ran out). */
  endedAt: number | null;
  /** The FocusSession row on the server, created after the first focused minute. */
  serverId: number | null;
  /** Focused seconds already saved on the server (added to the task's total). */
  syncedSeconds: number;
  /** The precise outcome aimed for. */
  intention: string;
  /** Times the user pressed "Distraction"; notes are the thoughts jotted down then. */
  distractions: number;
  capturedNotes: string[];
  /** Distraction count already saved on the server. */
  syncedDistractions: number;
  /** Work cycle of a Pomodoro-like method (index is 1-based); null for a free session. */
  cycle: { method: CycleMethodKey; index: number } | null;
}

/** What a finished cycle leaves for its review, shown during the break that follows. */
export interface SessionRecap {
  serverId: number | null;
  seconds: number;
  taskId: number | null;
  taskTitle: string | null;
  intention: string;
  distractions: number;
  capturedNotes: string[];
  startedAt: number;
  endedAt: number;
  /** Quality given in the review (already saved on the server). */
  quality?: number | null;
}

/** Break between two cycles: local only, never counted as focus. */
export interface FocusRest {
  kind: BreakKind;
  minutes: number;
  startedAt: number;
  /** Set when the break is over (time up). */
  endedAt: number | null;
  method: CycleMethodKey;
  nextIndex: number;
  recap: SessionRecap;
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

/** A timer that ran to its end (as opposed to one stopped early). */
export function timerCompleted(session: ActiveFocusSession): boolean {
  const length = timerMs(session);
  return length !== null && session.endedAt !== null && focusedMs(session, session.endedAt) >= length;
}

export function restEndsAt(rest: FocusRest): number {
  return rest.startedAt + rest.minutes * 60_000;
}

export interface StartOptions {
  mode: FocusMode;
  taskId: number | null;
  taskTitle: string | null;
  plannedMinutes: number | null;
  intention?: string;
  cycle?: ActiveFocusSession['cycle'];
}

interface FocusState {
  session: ActiveFocusSession | null;
  rest: FocusRest | null;
  /** Last save to the server failed (offline…): retried automatically. Not persisted. */
  syncError: boolean;
  start: (options: StartOptions) => void;
  pause: () => void;
  resume: () => void;
  /** Stop now, or at `at` (the exact moment a timer ran out). */
  stop: (at?: number) => void;
  clear: () => void;
  /** Count a distraction, keeping the thought noted (if any) for later. */
  addDistraction: (note: string) => void;
  /** After a completed cycle: start the break, keeping the cycle's recap for its review. */
  startRest: () => void;
  endRest: (at: number) => void;
  clearRest: () => void;
  /** Leave the break for the next work cycle (same task and intention). */
  nextCycle: () => void;
  /** Remember the quality given in the break's review (kept across reloads). */
  rateRecap: (quality: number) => void;
  /** Record a successful save, if `startedAt` still identifies the current session. */
  markSynced: (startedAt: number, serverId: number, seconds: number, distractions: number) => void;
  setSyncError: (failed: boolean) => void;
}

const MAX_NOTES = 20;
const MAX_NOTE_LENGTH = 200;

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      session: null,
      rest: null,
      syncError: false,
      start: ({ intention = '', cycle = null, ...options }) =>
        set({
          session: {
            ...options,
            intention: intention.trim(),
            cycle,
            startedAt: Date.now(),
            pausedAt: null,
            pausedMs: 0,
            endedAt: null,
            serverId: null,
            syncedSeconds: 0,
            distractions: 0,
            capturedNotes: [],
            syncedDistractions: 0,
          },
          rest: null,
          syncError: false,
        }),
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
      clear: () => set({ session: null, rest: null, syncError: false }),
      addDistraction: (note) => {
        const { session } = get();
        if (!session) return;
        const text = note.trim().slice(0, MAX_NOTE_LENGTH);
        const notes =
          text && session.capturedNotes.length < MAX_NOTES ? [...session.capturedNotes, text] : session.capturedNotes;
        set({ session: { ...session, distractions: session.distractions + 1, capturedNotes: notes } });
      },
      startRest: () => {
        const { session } = get();
        if (!session?.cycle || session.endedAt === null) return;
        const { method, index } = session.cycle;
        set({
          session: null,
          rest: {
            ...breakAfter(method, index),
            startedAt: session.endedAt,
            endedAt: null,
            method,
            nextIndex: index + 1,
            recap: {
              serverId: session.serverId,
              seconds: focusedSeconds(session, session.endedAt),
              taskId: session.taskId,
              taskTitle: session.taskTitle,
              intention: session.intention,
              distractions: session.distractions,
              capturedNotes: session.capturedNotes,
              startedAt: session.startedAt,
              endedAt: session.endedAt,
            },
          },
        });
      },
      endRest: (at) => {
        const { rest } = get();
        if (!rest || rest.endedAt !== null) return;
        set({ rest: { ...rest, endedAt: at } });
      },
      clearRest: () => set({ rest: null }),
      rateRecap: (quality) => {
        const { rest } = get();
        if (rest) set({ rest: { ...rest, recap: { ...rest.recap, quality } } });
      },
      nextCycle: () => {
        const { rest, start } = get();
        if (!rest) return;
        start({
          mode: 'timer',
          plannedMinutes: CYCLE_METHODS[rest.method].workMinutes,
          taskId: rest.recap.taskId,
          taskTitle: rest.recap.taskTitle,
          intention: rest.recap.intention,
          cycle: { method: rest.method, index: rest.nextIndex },
        });
      },
      markSynced: (startedAt, serverId, seconds, distractions) => {
        const { session } = get();
        if (!session || session.startedAt !== startedAt) return;
        set({
          session: { ...session, serverId, syncedSeconds: seconds, syncedDistractions: distractions },
          syncError: false,
        });
      },
      setSyncError: (syncError) => set({ syncError }),
    }),
    {
      name: 'mymarathon.focus',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ session, rest }) => ({ session, rest }),
      version: 1,
      // Version 0 sessions predate intentions, distractions and cycles.
      migrate: (persisted, version) => {
        const state = persisted as { session: ActiveFocusSession | null };
        if (version < 1 && state.session) {
          state.session = {
            ...state.session,
            intention: '',
            distractions: 0,
            capturedNotes: [],
            syncedDistractions: 0,
            cycle: null,
          };
        }
        return { session: state.session, rest: null };
      },
    },
  ),
);

/** What the clock shows: time left for a timer, time focused for a stopwatch. */
export function focusClockMs(session: ActiveFocusSession, now: number): number {
  const length = timerMs(session);
  const focused = focusedMs(session, now);
  return length === null ? focused : Math.max(0, length - focused);
}

/** Whole focused seconds, as saved on the server. */
export function focusedSeconds(session: ActiveFocusSession, now: number): number {
  return Math.floor(focusedMs(session, now) / 1000);
}
