import { Pressable, ScrollView, StyleSheet } from 'react-native';

import type { ISODate, Task } from '@/api/types';
import { fr } from '@/i18n/fr';
import { dayLongLabel } from '@/lib/calendar';
import { addDays } from '@/lib/dates';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Dialog } from './Dialog';

interface MoveTaskDialogProps {
  task: Task | null;
  days: ISODate[];
  onMove: (task: Task, plannedDate: ISODate | null) => void;
  onClose: () => void;
}

/** Choose another day for a task (works with mouse, touch, keyboard and screen readers). */
export function MoveTaskDialog({ task, days, onMove, onClose }: MoveTaskDialogProps) {
  const theme = useTheme();
  if (!task) return null;

  const choices: { label: string; value: ISODate | null }[] = days.map((day) => ({
    label: dayLongLabel(day),
    value: day,
  }));
  if (task.planned_date) {
    choices.push({ label: fr.screens.week.moveToNextWeek, value: addDays(task.planned_date, 7) });
    choices.push({ label: fr.screens.week.unschedule, value: null });
  }

  return (
    <Dialog visible title={fr.screens.week.moveTitle(task.title)} onClose={onClose}>
      <ScrollView style={styles.list}>
        {choices.map((choice) => {
          const current = choice.value === task.planned_date;
          return (
            <Pressable
              key={choice.label}
              accessibilityRole="button"
              accessibilityState={{ selected: current, disabled: current }}
              disabled={current}
              onPress={() => onMove(task, choice.value)}
              style={({ pressed }) => [
                styles.choice,
                { borderColor: current ? theme.primary : theme.border },
                current && { backgroundColor: theme.primarySoft },
                pressed && { opacity: 0.7 },
              ]}>
              <AppText color={current ? theme.primary : theme.text}>
                {choice.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  choice: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
