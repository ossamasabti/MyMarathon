import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCheckHabit } from '@/api/habits';
import type { Habit } from '@/api/types';
import { fr } from '@/i18n/fr';
import { WEEKDAY_SHORT } from '@/lib/calendar';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DomainDot } from './Badge';

/** "Tous les jours", "Lun, Mer, Ven" or "1 fois / semaine (Sam, Dim)". */
export function frequencyLabel(habit: Pick<Habit, 'frequency' | 'days'>): string {
  const days = habit.days.map((d) => WEEKDAY_SHORT[d]).join(', ');
  if (habit.frequency === 'weekly') return fr.habit.onceAWeek(days);
  return habit.days.length === 0 || habit.days.length === 7 ? fr.habit.everyDay : days;
}

export function streakLabel(habit: Pick<Habit, 'frequency' | 'streak'>): string | null {
  if (habit.streak <= 0) return null;
  return habit.frequency === 'weekly' ? fr.habit.streakWeeks(habit.streak) : fr.habit.streakDays(habit.streak);
}

interface HabitRowProps {
  habit: Habit;
  /** Hide the goal path (inside the goal's own detail screen). */
  hideGoal?: boolean;
}

/** A habit with today's checkbox, its frequency, streak and the goal it serves. */
export function HabitRow({ habit, hideGoal = false }: HabitRowProps) {
  const theme = useTheme();
  const check = useCheckHabit();
  const done = habit.done_today;
  const streak = streakLabel(habit);

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? fr.habit.markUndone(habit.title) : fr.habit.markDone(habit.title)}
        onPress={() => check.mutate({ id: habit.id, done: !done })}
        style={({ pressed }) => [styles.check, pressed && { opacity: 0.6 }]}>
        <Ionicons
          name={done ? 'checkbox' : 'square-outline'}
          size={28}
          color={done ? theme.success : theme.textMuted}
        />
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/habits/[id]', params: { id: String(habit.id) } })}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}>
        <View style={styles.titleRow}>
          <AppText style={styles.flex} numberOfLines={2}>
            {habit.title}
          </AppText>
          {streak ? <AppText variant="small">{streak}</AppText> : null}
        </View>
        <AppText variant="small">{frequencyLabel(habit)}</AppText>
        {hideGoal ? null : (
          <View style={styles.goalRow}>
            {habit.domain ? <DomainDot color={habit.domain.color} size={8} /> : null}
            <AppText variant="small" numberOfLines={1} style={styles.flex}>
              {habit.goal_path.length ? habit.goal_path.map((g) => g.title).join(' › ') : fr.habit.noGoal}
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center', paddingVertical: spacing.xs, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
});
