import type { Goal, Task } from '@/api/types';
import { fr } from '@/i18n/fr';

import { addDays, fromISO, todayISO } from './dates';
import { formatSlot } from './time';

/** Days ahead covered by deadline reminders (rescheduled at every app start / foreground). */
export const REMINDER_WINDOW_DAYS = 14;
/** iOS keeps at most 64 scheduled notifications; leave room for the weekly review one. */
export const MAX_DEADLINE_REMINDERS = 50;
export const REMINDER_HOUR = 9;
export const GOAL_REMINDER_DAYS_BEFORE = 3;
/** Morning summary of the tasks planned for the day. */
export const DAY_PLAN_HOUR = 8;
/** Days ahead covered by upcoming-task reminders (the app reschedules them whenever it opens). */
export const UPCOMING_WINDOW_DAYS = 6;
/** How long before a timed task its reminder fires (user choice). */
export const LEAD_MINUTES_CHOICES = [5, 10, 15, 30, 60] as const;
export const DEFAULT_LEAD_MINUTES = 15;

export interface PlannedReminder {
  /** Stable identifier, so rescheduling replaces instead of duplicating. */
  id: string;
  title: string;
  body: string;
  date: Date;
  /** Route opened when the notification is tapped. */
  href: string;
}

function at(iso: string, hour: number, minute = 0): Date {
  const date = fromISO(iso);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Only future reminders, nearest first, within the platform limit. */
export function limitReminders(reminders: PlannedReminder[], now: Date = new Date()): PlannedReminder[] {
  return reminders
    .filter((r) => r.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_DEADLINE_REMINDERS);
}

/**
 * Deadline reminders: 9:00 on the due day of each open task, and 9:00 three days before the
 * end of each active goal. Past times are skipped; the nearest ones are kept.
 */
export function planDeadlineReminders(tasks: Task[], goals: Goal[], now: Date = new Date()): PlannedReminder[] {
  const today = todayISO();
  const limit = addDays(today, REMINDER_WINDOW_DAYS);
  const planned: PlannedReminder[] = [];

  for (const task of tasks) {
    if (task.status === 'done' || !task.due_date || task.due_date < today || task.due_date > limit) continue;
    const goal = task.goal_path[task.goal_path.length - 1];
    planned.push({
      id: `deadline-task-${task.id}`,
      title: fr.notifications.taskDue(task.title),
      body: goal ? fr.notifications.forGoal(goal.title) : fr.notifications.taskDueBody,
      date: at(task.due_date, REMINDER_HOUR),
      href: `/tasks/${task.id}`,
    });
  }

  for (const goal of goals) {
    if (goal.status !== 'active') continue;
    const day = addDays(goal.end_date, -GOAL_REMINDER_DAYS_BEFORE);
    if (day < today || day > limit) continue;
    planned.push({
      id: `deadline-goal-${goal.id}`,
      title: fr.notifications.goalEnding(goal.title),
      body: fr.notifications.goalEndingBody(Math.round(goal.progress * 100)),
      date: at(day, REMINDER_HOUR),
      href: `/goals/${goal.id}`,
    });
  }

  return limitReminders(planned, now);
}

/**
 * Upcoming-task reminders for open tasks planned in the next days:
 * - `leadMinutes` before the start of each task that has a time slot;
 * - at 8:00, a summary of the day's planned tasks (skipped on days with none).
 * Ids keep the "deadline-" prefix: every reminder of the app is replaced in one sync.
 */
export function planUpcomingTaskReminders(tasks: Task[], leadMinutes: number, now: Date = new Date()): PlannedReminder[] {
  const today = todayISO();
  const limit = addDays(today, UPCOMING_WINDOW_DAYS);
  const open = tasks.filter(
    (t) => t.status !== 'done' && t.planned_date !== null && t.planned_date >= today && t.planned_date <= limit,
  );
  const planned: PlannedReminder[] = [];

  for (const task of open) {
    if (!task.planned_date || !task.start_time) continue;
    const [hours = 0, minutes = 0] = task.start_time.split(':').map(Number);
    const start = at(task.planned_date, hours, minutes);
    const goal = task.goal_path[task.goal_path.length - 1];
    const slot = formatSlot(task.start_time, task.end_time) ?? '';
    planned.push({
      id: `deadline-slot-${task.id}`,
      title: fr.notifications.slotSoon(leadMinutes, task.title),
      body: goal ? `${slot} · ${goal.title}` : slot,
      date: new Date(start.getTime() - leadMinutes * 60_000),
      href: `/tasks/${task.id}`,
    });
  }

  const byDay = new Map<string, Task[]>();
  for (const task of open) {
    if (!task.planned_date) continue;
    byDay.set(task.planned_date, [...(byDay.get(task.planned_date) ?? []), task]);
  }
  for (const [day, dayTasks] of byDay) {
    planned.push({
      id: `deadline-day-${day}`,
      title: fr.notifications.dayPlan(dayTasks.length),
      body: fr.notifications.dayPlanBody(dayTasks.map((t) => t.title)),
      date: at(day, DAY_PLAN_HOUR),
      href: '/',
    });
  }

  return limitReminders(planned, now);
}
