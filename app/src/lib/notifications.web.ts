import type { PlannedReminder } from './reminders';

// Web: scheduled local notifications do not exist in browsers; reminders are a mobile feature.
// Same API as notifications.ts so callers need no platform checks.

export const notificationsSupported = false;

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function configureNotifications(): Promise<void> {}

export async function getPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function scheduleReviewReminder(_enabled: boolean): Promise<void> {}

export async function syncDeadlineReminders(_reminders: PlannedReminder[]): Promise<void> {}

export async function cancelAllReminders(): Promise<void> {}

export function onReminderOpened(_onOpen: (href: string) => void): () => void {
  return () => {};
}
