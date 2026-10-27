import type { ISODate } from '@/api/types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse "YYYY-MM-DD" as a local date (no timezone shift). */
export function fromISO(iso: ISODate): Date {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = fromISO(iso);
  date.setDate(date.getDate() + days);
  return toISO(date);
}

export function endOfMonth(iso: ISODate = todayISO()): ISODate {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function endOfQuarter(iso: ISODate = todayISO()): ISODate {
  const d = fromISO(iso);
  const quarterEndMonth = Math.floor(d.getMonth() / 3) * 3 + 3;
  return toISO(new Date(d.getFullYear(), quarterEndMonth, 0));
}

export function endOfYear(iso: ISODate = todayISO()): ISODate {
  return `${fromISO(iso).getFullYear()}-12-31`;
}

/** "JJ/MM/AAAA" -> ISO, or null when invalid. */
export function parseFrenchDate(text: string): ISODate | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [, d, m, y] = match.map(Number) as [number, number, number, number];
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return toISO(date);
}

/** ISO -> "JJ/MM/AAAA" (input format). */
export function toFrenchInput(iso: ISODate | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const shortFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const longFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Human-readable date: "12 mars" this year, "12 mars 2027" otherwise. */
export function formatDate(iso: ISODate): string {
  const date = fromISO(iso);
  return date.getFullYear() === new Date().getFullYear() ? shortFormatter.format(date) : longFormatter.format(date);
}

/** Default date range for a new goal of the given horizon, starting today. */
export function defaultRange(horizon: 'vision' | 'annual' | 'quarterly' | 'monthly'): [ISODate, ISODate] {
  const start = todayISO();
  switch (horizon) {
    case 'vision': {
      const d = fromISO(start);
      return [start, `${d.getFullYear() + 4}-12-31`];
    }
    case 'annual':
      return [start, endOfYear(start)];
    case 'quarterly':
      return [start, endOfQuarter(start)];
    case 'monthly':
      return [start, endOfMonth(start)];
  }
}
