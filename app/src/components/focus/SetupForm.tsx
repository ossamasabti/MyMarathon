import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useStartFocusOnTask } from '@/api/focus';
import { useTodayTasks } from '@/api/tasks';
import type { Task } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { CYCLE_METHODS, FOCUS_METHODS, isCycleMethod, type FocusMethodKey } from '@/lib/focusMethods';
import { useFocusStore, type StartOptions } from '@/stores/focusStore';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const TIMER_PRESETS = [25, 45, 60] as const;
const MAX_TIMER_MINUTES = 600;
const MAX_INTENTION_LENGTH = 200;

/** Before starting: task, method (cycles or a single session) and the intention. */
export function SetupForm({ initialTask }: { initialTask: Task | null }) {
  const theme = useTheme();
  const startFree = useFocusStore((s) => s.start);
  const startOnTask = useStartFocusOnTask();
  const today = useTodayTasks();
  const [taskId, setTaskId] = useState<number | null>(initialTask?.id ?? null);
  const [method, setMethod] = useState<FocusMethodKey>(initialTask?.estimated_minutes ? 'timer' : 'pomodoro');
  const [minutes, setMinutes] = useState(String(initialTask?.estimated_minutes ?? TIMER_PRESETS[0]));
  const [intention, setIntention] = useState('');

  // Tasks to pick from: the one passed in, then today's open tasks.
  const choices = new Map<number, Task>();
  if (initialTask) choices.set(initialTask.id, initialTask);
  for (const task of [...(today.data?.overdue ?? []), ...(today.data?.today ?? [])]) {
    if (task.status !== 'done') choices.set(task.id, task);
  }
  const taskOptions = [
    { value: null, label: fr.focus.noTask },
    ...[...choices.values()].map((t) => ({ value: t.id, label: t.title })),
  ];

  const parsedMinutes = Number.parseInt(minutes, 10);
  const minutesValid = Number.isInteger(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= MAX_TIMER_MINUTES;
  const canStart = method !== 'timer' || minutesValid;

  const begin = () => {
    if (!canStart) return;
    const options: Omit<StartOptions, 'taskId' | 'taskTitle'> = isCycleMethod(method)
      ? { mode: 'timer', plannedMinutes: CYCLE_METHODS[method].workMinutes, cycle: { method, index: 1 }, intention }
      : { mode: method, plannedMinutes: method === 'timer' ? parsedMinutes : null, intention };
    const task = taskId === null ? undefined : choices.get(taskId);
    if (task) startOnTask(task, options);
    else startFree({ ...options, taskId: null, taskTitle: null });
  };

  return (
    <View style={styles.form}>
      <AppText variant="muted">{fr.focus.intro}</AppText>
      <ChipSelect label={fr.focus.task} options={taskOptions} value={taskId} onChange={setTaskId} />
      <TextField
        label={fr.focus.intention}
        value={intention}
        onChangeText={setIntention}
        placeholder={fr.focus.intentionPlaceholder}
        maxLength={MAX_INTENTION_LENGTH}
      />
      <AppText variant="small">{fr.focus.intentionHint}</AppText>
      <ChipSelect
        label={fr.focus.method}
        options={FOCUS_METHODS.map((key) => ({ value: key, label: fr.focus.methods[key] }))}
        value={method}
        onChange={setMethod}
      />
      <AppText variant="small">{fr.focus.methodHints[method]}</AppText>
      {method === 'timer' ? (
        <>
          <ChipSelect
            label={fr.focus.length}
            options={TIMER_PRESETS.map((m) => ({ value: String(m), label: fr.focus.minutes(m) }))}
            value={minutes}
            onChange={setMinutes}
          />
          <TextField
            label={fr.focus.customLength}
            value={minutes}
            onChangeText={setMinutes}
            inputMode="numeric"
            maxLength={3}
            errors={minutesValid ? [] : [fr.focus.invalidLength(MAX_TIMER_MINUTES)]}
          />
        </>
      ) : null}
      <AppText variant="small">{fr.focus.autoSaveHint}</AppText>
      <Button label={fr.focus.start} onPress={begin} disabled={!canStart} />
      {Platform.OS === 'web' ? (
        <AppText variant="small" color={theme.textMuted}>
          {fr.focus.webHint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
