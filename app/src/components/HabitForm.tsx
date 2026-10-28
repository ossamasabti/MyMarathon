import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import type { Frequency, Habit, HabitInput } from '@/api/types';
import { fr } from '@/i18n/fr';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { ChipSelect } from './ChipSelect';
import { DayPicker } from './DayPicker';
import { GoalPicker } from './GoalPicker';
import { TextField } from './TextField';

interface HabitFormProps {
  initial?: Habit;
  /** Prefilled goal (goal detail screen). */
  defaultGoal?: number;
  onSubmit: (input: HabitInput) => void;
  pending: boolean;
  error: Error | null;
}

const FREQUENCIES: Frequency[] = ['daily', 'weekly'];

export function HabitForm({ initial, defaultGoal, onSubmit, pending, error }: HabitFormProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [goal, setGoal] = useState<number | null>(initial?.goal ?? defaultGoal ?? null);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'daily');
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const apiError = error instanceof ApiError ? error : null;
  const errorsFor = (field: string) => [
    ...(localErrors[field] ? [localErrors[field]] : []),
    ...(apiError?.fieldErrors(field) ?? []),
  ];
  const otherError =
    error && !['title', 'goal', 'days', 'frequency'].some((f) => apiError?.fieldErrors(f).length) ? error.message : null;

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = fr.common.required;
    if (goal === null) errors.goal = fr.habit.goalRequired;
    setLocalErrors(errors);
    if (Object.keys(errors).length || goal === null) return;
    onSubmit({ title: title.trim(), goal, frequency, days });
  };

  return (
    <View style={styles.form}>
      <TextField label={fr.habit.title} value={title} onChangeText={setTitle} errors={errorsFor('title')} />
      <GoalPicker
        label={fr.habit.goal}
        value={goal}
        onChange={setGoal}
        noneLabel={fr.habit.pickGoal}
        errors={errorsFor('goal')}
      />
      <ChipSelect
        label={fr.habit.frequency}
        options={FREQUENCIES.map((f) => ({ value: f, label: fr.frequency[f] }))}
        value={frequency}
        onChange={setFrequency}
        errors={errorsFor('frequency')}
      />
      <DayPicker
        label={fr.habit.days}
        value={days}
        onChange={setDays}
        hint={frequency === 'weekly' ? fr.habit.weeklyHint : fr.habit.dailyHint}
        errors={errorsFor('days')}
      />
      {otherError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {otherError}
        </AppText>
      ) : null}
      <Button label={fr.common.save} onPress={submit} loading={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
