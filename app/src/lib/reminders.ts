import type { Goal, Task } from '@/api/types';
import { fr } from '@/i18n/fr';

import { addDays, fromISO, todayISO } from './dates';

/** Days ahead covered by deadline reminders (rescheduled at every app start / foreground). */
export const REMINDER_WINDOW_DAYS = 14;
/** iOS keeps at most 64 scheduled notifications; leave room for the weekly review one. */
export const MAX_DEADLINE_REMINDERS = 50;
export const REMINDER_HOUR = 9;
export const GOAL_REMINDER_DAYS_BEFORE = 3;

export interface PlannedReminder {
  /** Stable identifier, so rescheduling replaces instead of duplicating. */
  id: string;
  title: string;
  body: string;
  date: Date;
  /** Route opened when the notification is tapped. */
  href: string;
}

function at(iso: string, hour: number): Date {
  const date = fromISO(iso);
  date.setHours(hour, 0, 0, 0);
  return date;
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

  return planned
    .filter((r) => r.date.getTime() > now.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, MAX_DEADLINE_REMINDERS);
}
