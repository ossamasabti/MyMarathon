import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';

import { fr } from '@/i18n/fr';

import { requestPermission } from './notifications';

// Native end-of-timer alert: a local notification (works with the app in the background)
// plus a vibration when the app is open. The web counterpart is focusAlert.web.ts.

const FOCUS_END_ID = 'focus-end';

/** Schedule the "time is up" notification; silently skipped when notifications are refused. */
export async function scheduleFocusEnd(at: number, taskTitle: string | null): Promise<void> {
  await cancelFocusEnd();
  if (at <= Date.now() || (await requestPermission()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_END_ID,
    content: {
      title: fr.focus.endTitle,
      body: taskTitle ?? fr.focus.endBodyFree,
      data: { href: '/focus' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'reminders' },
  });
}

export async function cancelFocusEnd(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(FOCUS_END_ID).catch(() => undefined);
}

export function playFocusEnd(): void {
  Vibration.vibrate([0, 400, 200, 400]);
}
