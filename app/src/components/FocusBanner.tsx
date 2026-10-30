import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fr } from '@/i18n/fr';
import { cancelFocusEnd, playFocusEnd, scheduleFocusEnd } from '@/lib/focusAlert';
import { isFocusSaved, syncFocus } from '@/lib/focusSync';
import { formatClock } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { focusClockMs, restEndsAt, timerCompleted, timerEndsAt, useFocusStore } from '@/stores/focusStore';
import { usePrefsStore } from '@/stores/prefsStore';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useIsWide, useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

/** A late end (app reopened long after the timer ran out) is not worth a chime. */
const CHIME_GRACE_MS = 5000;
/** How often a running session checks whether a new minute must be saved. */
const SYNC_CHECK_MS = 10_000;
/** Leaves room for the mobile tab bar. */
const TAB_BAR_HEIGHT = 64;

/**
 * Keeps the focus session ticking app-wide: saves each new minute to the server (added to the
 * task's total), stops a timer when it runs out, moves a finished cycle to its break and ends
 * the break (chime / vibration, plus a scheduled notification on mobile), and shows a floating
 * pill back to /focus elsewhere.
 */
export function FocusBanner() {
  const theme = useTheme();
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const session = useFocusStore((s) => s.session);
  const rest = useFocusStore((s) => s.rest);
  const running = session !== null && session.pausedAt === null && session.endedAt === null;
  const resting = rest !== null && rest.endedAt === null;
  const now = useNow(running || resting);
  const queryClient = useQueryClient();
  const syncError = useFocusStore((s) => s.syncError);

  // Save on start/pause/resume/stop (and once restored after a reload)…
  const phase = session ? `${session.startedAt}:${session.pausedAt}:${session.endedAt}` : null;
  useEffect(() => {
    if (phase) void syncFocus(queryClient);
  }, [phase, queryClient]);
  // …and while running (each new minute) or after a failed save (retry).
  useEffect(() => {
    if (!running && !syncError) return;
    const id = setInterval(() => void syncFocus(queryClient), SYNC_CHECK_MS);
    return () => clearInterval(id);
  }, [running, syncError, queryClient]);

  // A cycle that ran to its end goes to its break once its time is safely saved.
  const cycleDone = session !== null && session.cycle !== null && timerCompleted(session) && isFocusSaved(session);
  useEffect(() => {
    if (cycleDone) useFocusStore.getState().startRest();
  }, [cycleDone]);

  // One alarm at a time: the end of the running timer, or the end of the break.
  const timerEnd = session ? timerEndsAt(session) : null;
  const restEnd = resting ? restEndsAt(rest) : null;
  const alarmAt = timerEnd ?? restEnd;
  const alarmTitle = timerEnd !== null ? fr.focus.endTitle : fr.focus.restEndTitle;
  const alarmBody =
    timerEnd !== null ? (session?.taskTitle ?? fr.focus.endBodyFree) : fr.focus.restEndBody(rest?.nextIndex ?? 1);
  const isRestAlarm = timerEnd === null;
  useEffect(() => {
    if (alarmAt === null) {
      void cancelFocusEnd();
      return;
    }
    void scheduleFocusEnd(alarmAt, alarmTitle, alarmBody);
    const id = setTimeout(() => {
      const onTime = Date.now() - alarmAt < CHIME_GRACE_MS;
      const store = useFocusStore.getState();
      if (isRestAlarm) {
        store.endRest(alarmAt);
        // Chaining only right on time: reopening the app later waits for a click.
        if (onTime && usePrefsStore.getState().autoChainCycles) store.nextCycle();
      } else {
        store.stop(alarmAt);
      }
      if (onTime) playFocusEnd();
    }, Math.max(0, alarmAt - Date.now()));
    return () => clearTimeout(id);
  }, [alarmAt, alarmTitle, alarmBody, isRestAlarm]);

  if ((!session && !rest) || pathname === '/focus') return null;

  let status: string;
  let icon: 'flag' | 'timer-outline' | 'cafe-outline' = 'timer-outline';
  if (session) {
    const clock = formatClock(focusClockMs(session, now));
    if (session.endedAt !== null) {
      status = fr.focus.bannerEnded;
      icon = 'flag';
    } else {
      status = session.pausedAt !== null ? `${clock} · ${fr.focus.paused}` : clock;
    }
  } else {
    icon = 'cafe-outline';
    status =
      rest && rest.endedAt === null
        ? fr.focus.bannerRest(formatClock(restEndsAt(rest) - now))
        : fr.focus.restDone;
  }
  const taskTitle = session?.taskTitle ?? rest?.recap.taskTitle ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fr.focus.bannerLabel(status)}
      onPress={() => router.push('/focus')}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.primary,
          bottom: wide ? spacing.lg : insets.bottom + TAB_BAR_HEIGHT + spacing.sm,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Ionicons name={icon} size={20} color={theme.onPrimary} />
      <AppText color={theme.onPrimary} style={styles.clock}>
        {status}
      </AppText>
      {taskTitle ? (
        <AppText variant="small" color={theme.onPrimary} numberOfLines={1} style={styles.task}>
          {taskTitle}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: spacing.lg,
    maxWidth: 360,
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    elevation: 4,
  },
  clock: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  task: { flexShrink: 1 },
});
