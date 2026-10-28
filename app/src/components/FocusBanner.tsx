import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fr } from '@/i18n/fr';
import { cancelFocusEnd, playFocusEnd, scheduleFocusEnd } from '@/lib/focusAlert';
import { syncFocus } from '@/lib/focusSync';
import { formatClock } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { focusClockMs, timerEndsAt, useFocusStore } from '@/stores/focusStore';
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
 * task's total), stops a timer when it runs out (chime / vibration, plus a scheduled notification
 * on mobile), and shows a floating pill back to /focus elsewhere.
 */
export function FocusBanner() {
  const theme = useTheme();
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const session = useFocusStore((s) => s.session);
  const endsAt = session ? timerEndsAt(session) : null;
  const taskTitle = session?.taskTitle ?? null;
  const running = session !== null && session.pausedAt === null && session.endedAt === null;
  const now = useNow(running);
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

  useEffect(() => {
    if (endsAt === null) {
      void cancelFocusEnd();
      return;
    }
    void scheduleFocusEnd(endsAt, taskTitle);
    const id = setTimeout(() => {
      useFocusStore.getState().stop(endsAt);
      if (Date.now() - endsAt < CHIME_GRACE_MS) playFocusEnd();
    }, Math.max(0, endsAt - Date.now()));
    return () => clearTimeout(id);
  }, [endsAt, taskTitle]);

  if (!session || pathname === '/focus') return null;

  const status =
    session.endedAt !== null
      ? fr.focus.bannerEnded
      : session.pausedAt !== null
        ? `${formatClock(focusClockMs(session, now))} · ${fr.focus.paused}`
        : formatClock(focusClockMs(session, now));

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
      <Ionicons name={session.endedAt !== null ? 'flag' : 'timer-outline'} size={20} color={theme.onPrimary} />
      <AppText color={theme.onPrimary} style={styles.clock}>
        {status}
      </AppText>
      {session.taskTitle ? (
        <AppText variant="small" color={theme.onPrimary} numberOfLines={1} style={styles.task}>
          {session.taskTitle}
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
