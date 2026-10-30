/** Times of day ("HH:MM") and durations. The API sends times as "HH:MM:SS". */

export type ClockTime = string;

/** Accepts "9", "9h", "9h30", "09:30", "0930" → "09:30"; null when invalid. */
export function parseTime(text: string): ClockTime | null {
  const match = /^(\d{1,2})(?:\s*[:hH.]\s*(\d{0,2}))?$/.exec(text.trim()) ?? /^(\d{2})(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hours > 23 || minutes > 59 || (match[2] !== undefined && match[2].length === 1)) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "09:30:00" → "09:30". */
export function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

/** "09:00" + 90 → "10:30", capped at 23:59 (a slot never crosses midnight). */
export function addMinutesToTime(time: ClockTime, minutes: number): ClockTime {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** "09:00 – 10:30", or "09:00" without an end. */
export function formatSlot(start: string | null, end: string | null): string | null {
  if (!start) return null;
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

/** Human duration: "45 s", "25 min", "1 h", "1 h 05". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  // Whole minutes only: a minute counts once it is complete.
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

/** Stopwatch display: "04:07", "1:04:07". */
export function formatClock(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours ? `${hours}:${mmss}` : mmss;
}

/** Local time of a timestamp, "14:05". */
export function formatTimeOfDay(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

/** Focus totals: whole minutes, "0 min" rather than seconds below a minute. */
export function formatFocusTotal(seconds: number): string {
  return seconds < 60 ? '0 min' : formatDuration(seconds);
}
