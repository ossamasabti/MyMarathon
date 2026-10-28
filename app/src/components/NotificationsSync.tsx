import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useGoals } from '@/api/goals';
import { useTasks } from '@/api/tasks';
import { addDays, todayISO } from '@/lib/dates';
import {
  configureNotifications,
  getPermission,
  notificationsSupported,
  onReminderOpened,
  scheduleReviewReminder,
  syncDeadlineReminders,
} from '@/lib/notifications';
import { planDeadlineReminders, REMINDER_WINDOW_DAYS } from '@/lib/reminders';
import { usePrefsStore } from '@/stores/prefsStore';

/**
 * Keeps scheduled reminders in line with the data: on start, when the app comes back to the
 * foreground and whenever tasks or goals change. Renders nothing; does nothing on the web.
 */
export function NotificationsSync() {
  if (!notificationsSupported) return null;
  return <NativeNotificationsSync />;
}

function NativeNotificationsSync() {
  const notifyDeadlines = usePrefsStore((s) => s.notifyDeadlines);
  const notifyReview = usePrefsStore((s) => s.notifyReview);
  const [foregroundTick, setForegroundTick] = useState(0);

  const today = todayISO();
  const tasks = useTasks({ due_after: today, due_before: addDays(today, REMINDER_WINDOW_DAYS) });
  const goals = useGoals({ status: 'active' });

  useEffect(() => {
    configureNotifications();
    const unsubscribe = onReminderOpened((href) => router.push(href as Href));
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegroundTick((n) => n + 1);
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = (await getPermission()) === 'granted';
      if (cancelled) return;
      await scheduleReviewReminder(granted && notifyReview);
      if (!tasks.data || !goals.data) return;
      const planned = granted && notifyDeadlines ? planDeadlineReminders(tasks.data, goals.data) : [];
      await syncDeadlineReminders(planned);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [notifyDeadlines, notifyReview, tasks.data, goals.data, foregroundTick]);

  return null;
}
