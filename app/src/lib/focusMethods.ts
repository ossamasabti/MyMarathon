/** Focus methods: work cycles separated by breaks (Pomodoro family), or a single free session. */

export type CycleMethodKey = 'pomodoro' | 'long' | 'deep';
export type FocusMethodKey = CycleMethodKey | 'timer' | 'stopwatch';

export interface CycleMethod {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  /** A long break comes after this many cycles. */
  cyclesPerSet: number;
}

export const CYCLE_METHODS: Record<CycleMethodKey, CycleMethod> = {
  pomodoro: { workMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, cyclesPerSet: 4 },
  long: { workMinutes: 50, breakMinutes: 10, longBreakMinutes: 20, cyclesPerSet: 3 },
  deep: { workMinutes: 90, breakMinutes: 20, longBreakMinutes: 30, cyclesPerSet: 2 },
};

export const FOCUS_METHODS: FocusMethodKey[] = ['pomodoro', 'long', 'deep', 'timer', 'stopwatch'];

export function isCycleMethod(key: FocusMethodKey): key is CycleMethodKey {
  return key in CYCLE_METHODS;
}

export type BreakKind = 'short' | 'long';

/** Break after cycle `index` (1-based): a long one closes each set. */
export function breakAfter(method: CycleMethodKey, index: number): { kind: BreakKind; minutes: number } {
  const { breakMinutes, longBreakMinutes, cyclesPerSet } = CYCLE_METHODS[method];
  return index % cyclesPerSet === 0 ? { kind: 'long', minutes: longBreakMinutes } : { kind: 'short', minutes: breakMinutes };
}

/** Position of cycle `index` in its set: cycle 6 of a 4-cycle Pomodoro is 2/4. */
export function positionInSet(method: CycleMethodKey, index: number): { position: number; size: number } {
  const size = CYCLE_METHODS[method].cyclesPerSet;
  return { position: ((index - 1) % size) + 1, size };
}
