import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useCheckHabit, useHabitLogs } from '@/api/habits';
import type { Habit } from '@/api/types';
import { fr } from '@/i18n/fr';
import { dayLongLabel, startOfWeek, WEEKDAY_LETTERS, weekdayIndex } from '@/lib/calendar';
import { addDays, fromISO, todayISO } from '@/lib/dates';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { ErrorState, LoadingState } from './States';

const WEEKS = 4;

/** The last 4 weeks (Monday → Sunday); past scheduled days can be checked to catch up. */
export function HabitHistory({ habit }: { habit: Habit }) {
  const theme = useTheme();
  const today = todayISO();
  const firstMonday = addDays(startOfWeek(today), -7 * (WEEKS - 1));
  const lastDay = addDays(firstMonday, 7 * WEEKS - 1);
  const logs = useHabitLogs(habit.id, firstMonday, lastDay);
  const check = useCheckHabit();

  if (logs.isPending) return <LoadingState />;
  if (logs.isError) return <ErrorState message={logs.error.message} onRetry={() => logs.refetch()} />;

  const done = new Set(logs.data.filter((l) => l.done).map((l) => l.date));
  const scheduled = (iso: string) => habit.days.length === 0 || habit.days.includes(weekdayIndex(iso));
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)),
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {WEEKDAY_LETTERS.map((letter, i) => (
          <AppText key={i} variant="small" style={styles.headerCell}>
            {letter}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.row}>
          {week.map((day) => {
            const isFuture = day > today;
            const isDone = done.has(day);
            const isScheduled = scheduled(day);
            const state = isFuture
              ? fr.habit.stateFuture
              : isDone
                ? fr.habit.stateDone
                : isScheduled
                  ? fr.habit.stateMissed
                  : fr.habit.stateOff;
            return (
              <Pressable
                key={day}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone, disabled: isFuture }}
                accessibilityLabel={fr.habit.cell(dayLongLabel(day), state)}
                disabled={isFuture || check.isPending}
                onPress={() => check.mutate({ id: habit.id, done: !isDone, date: day })}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: isDone ? theme.success : isScheduled ? theme.surface : theme.surfaceAlt,
                    borderColor: day === today ? theme.primary : theme.border,
                    borderWidth: day === today ? 2 : 1,
                    opacity: isFuture ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}>
                {isDone ? (
                  <Ionicons name="checkmark" size={18} color={theme.onPrimary} />
                ) : (
                  <AppText variant="small" color={isScheduled ? theme.text : theme.textMuted}>
                    {fromISO(day).getDate()}
                  </AppText>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
      <AppText variant="small">{fr.habit.historyHint}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  headerCell: { width: MIN_TOUCH, textAlign: 'center' },
  cell: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
