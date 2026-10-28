import type { ISODate } from '@/api/types';

import { addDays, fromISO, todayISO, toISO } from './dates';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: ISODate = todayISO()): ISODate {
  const date = fromISO(iso);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return toISO(date);
}

export function weekDays(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const weekdayDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

/** Uppercase the first letter only ("lundi 27 octobre" -> "Lundi 27 octobre"). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "26 oct. – 1 nov." */
export function weekLabel(start: ISODate): string {
  return `${dayMonth.format(fromISO(start))} – ${dayMonth.format(fromISO(addDays(start, 6)))}`;
}

/** "lun. 27" */
export function dayLabel(iso: ISODate): string {
  return capitalize(weekdayDay.format(fromISO(iso)));
}

/** "lundi 27 octobre" (accessibility, dialogs). */
export function dayLongLabel(iso: ISODate): string {
  return capitalize(weekdayLong.format(fromISO(iso)));
}

export function yearBounds(year: number): [ISODate, ISODate] {
  return [`${year}-01-01`, `${year}-12-31`];
}

/** Days from `a` to `b` (b − a), DST-safe. */
function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / DAY_MS);
}

export interface BarGeometry {
  leftPct: number;
  widthPct: number;
  /** The goal starts before / ends after the displayed period. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

/** Minimum width so that very short goals stay visible and tappable. */
const MIN_WIDTH_PCT = 1.5;

/** Position of a [start, end] bar inside [periodStart, periodEnd], in percent. */
export function barGeometry(start: ISODate, end: ISODate, periodStart: ISODate, periodEnd: ISODate): BarGeometry {
  const total = daysBetween(periodStart, periodEnd) + 1;
  const clippedStart = start < periodStart;
  const clippedEnd = end > periodEnd;
  const from = clippedStart ? 0 : daysBetween(periodStart, start);
  const to = clippedEnd ? total : daysBetween(periodStart, end) + 1;
  const leftPct = (from / total) * 100;
  const widthPct = Math.max(MIN_WIDTH_PCT, ((to - from) / total) * 100);
  return { leftPct: Math.min(leftPct, 100 - widthPct), widthPct, clippedStart, clippedEnd };
}

export interface MonthTick {
  label: string;
  leftPct: number;
  widthPct: number;
}

export function monthTicks(year: number): MonthTick[] {
  const [yearStart, yearEnd] = yearBounds(year);
  return Array.from({ length: 12 }, (_, month) => {
    const first = toISO(new Date(year, month, 1));
    const last = toISO(new Date(year, month + 1, 0));
    const { leftPct, widthPct } = barGeometry(first, last, yearStart, yearEnd);
    return { label: capitalize(monthShort.format(new Date(year, month, 1))), leftPct, widthPct };
  });
}

/** Position of today on the year, or null when another year is displayed. */
export function todayPct(year: number, today: ISODate = todayISO()): number | null {
  const [yearStart, yearEnd] = yearBounds(year);
  if (today < yearStart || today > yearEnd) return null;
  return ((daysBetween(yearStart, today) + 0.5) / (daysBetween(yearStart, yearEnd) + 1)) * 100;
}

export type PeriodType = 'weekly' | 'monthly' | 'quarterly';

/** [start, end] of the period of `type` containing `iso` (same rules as the backend). */
export function periodBounds(type: PeriodType, iso: ISODate = todayISO()): [ISODate, ISODate] {
  const date = fromISO(iso);
  if (type === 'weekly') {
    const start = startOfWeek(iso);
    return [start, addDays(start, 6)];
  }
  const firstMonth = type === 'monthly' ? date.getMonth() : Math.floor(date.getMonth() / 3) * 3;
  const months = type === 'monthly' ? 1 : 3;
  return [toISO(new Date(date.getFullYear(), firstMonth, 1)), toISO(new Date(date.getFullYear(), firstMonth + months, 0))];
}

/** Start of the previous (-1) or next (+1) period. */
export function shiftPeriod(type: PeriodType, start: ISODate, delta: number): ISODate {
  if (type === 'weekly') return addDays(start, 7 * delta);
  const date = fromISO(start);
  const months = type === 'monthly' ? 1 : 3;
  return toISO(new Date(date.getFullYear(), date.getMonth() + months * delta, 1));
}

const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** "Semaine du 26 oct.", "Octobre 2026", "T4 2026". */
export function periodLabel(type: PeriodType, start: ISODate): string {
  const date = fromISO(start);
  if (type === 'weekly') return `Semaine du ${dayMonth.format(date)}`;
  if (type === 'monthly') return capitalize(monthYear.format(date));
  return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

/** Weekday short labels, Monday first. */
export const WEEKDAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

/** Monday = 0 … Sunday = 6. */
export function weekdayIndex(iso: ISODate): number {
  return (fromISO(iso).getDay() + 6) % 7;
}
