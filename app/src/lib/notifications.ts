import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { fr } from '@/i18n/fr';

import type { PlannedReminder } from './reminders';

// Native (Android / iOS) local notifications. The web counterpart is notifications.web.ts.

export const notificationsSupported = true;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

const CHANNEL_ID = 'reminders';
const REVIEW_ID = 'review-weekly';
const DEADLINE_PREFIX = 'deadline-';
/** expo-notifications weekly triggers count weekdays from 1 = Sunday. */
const SUNDAY = 1;
const REVIEW_HOUR = 18;

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: fr.notifications.channel,
      importance: AndroidImportance.DEFAULT,
    });
  }
}

export async function getPermission(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestPermission(): Promise<PermissionState> {
  await configureNotifications();
  const current = await getPermission();
  if (current !== 'undetermined') return current;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

/** Weekly reminder on Sunday at 18:00 (or removed when disabled). */
export async function scheduleReviewReminder(enabled: boolean): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REVIEW_ID).catch(() => undefined);
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: REVIEW_ID,
    content: { title: fr.notifications.reviewTitle, body: fr.notifications.reviewBody, data: { href: '/review' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: SUNDAY,
      hour: REVIEW_HOUR,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
}

/** Replace every scheduled deadline reminder with `reminders`. */
export async function syncDeadlineReminders(reminders: PlannedReminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(DEADLINE_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body, data: { href: reminder.href } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Call `onOpen(href)` when the user taps a reminder. Returns an unsubscribe function. */
export function onReminderOpened(onOpen: (href: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const href = response.notification.request.content.data?.href;
    if (typeof href === 'string') onOpen(href);
  });
  return () => subscription.remove();
}
