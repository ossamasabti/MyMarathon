import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFocusOverview, useLiveTodayFocus } from '@/api/focus';
import type { FocusOverview } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { fr } from '@/i18n/fr';
import { formatFocusTotal } from '@/lib/time';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { DailyGoalDialog } from './DailyGoalDialog';

/**
 * Today's focus against the daily goal, with the streak. Secondary information: hidden while
 * loading or when the overview cannot be fetched (the screen around it handles its own states).
 */
export function FocusTodayCard({ showStart = true }: { showStart?: boolean }) {
  const overview = useFocusOverview();
  if (!overview.data) return null;
  return <CardContent overview={overview.data} showStart={showStart} />;
}

function CardContent({ overview, showStart }: { overview: FocusOverview; showStart: boolean }) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const seconds = useLiveTodayFocus(overview);
  const goalSeconds = overview.goal_minutes * 60;
  const reached = seconds >= goalSeconds;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Ionicons name="flame" size={22} color={overview.streak > 0 ? theme.primary : theme.textMuted} />
        <AppText variant="heading" style={styles.flex}>
          {fr.focus.todayTitle}
        </AppText>
        <IconButton icon="create-outline" label={fr.focus.editGoal} onPress={() => setEditing(true)} />
      </View>
      <AppText style={styles.figure}>
        {fr.focus.todayProgress(formatFocusTotal(seconds), formatFocusTotal(goalSeconds))}
      </AppText>
      <ProgressBar value={seconds / goalSeconds} achieved={reached} compact />
      <AppText variant="small" color={reached ? theme.success : undefined}>
        {reached ? fr.focus.goalReachedToday : fr.focus.goalRemaining(formatFocusTotal(goalSeconds - seconds))}
      </AppText>
      <AppText color={theme.text}>{fr.focus.streak(overview.streak)}</AppText>
      {showStart ? <Button label={fr.focus.focusNow} onPress={() => router.push('/focus')} /> : null}
      <DailyGoalDialog visible={editing} goalMinutes={overview.goal_minutes} onClose={() => setEditing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderRadius: radius.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  figure: { fontSize: 24, lineHeight: 30, fontWeight: '600', fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
});
