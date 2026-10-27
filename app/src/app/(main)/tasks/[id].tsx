import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useDeleteTask, useSaveTask, useTask } from '@/api/tasks';
import type { Priority, Task, TaskStatus } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { DateField } from '@/components/DateField';
import { ConfirmDialog } from '@/components/Dialog';
import { GoalPicker } from '@/components/GoalPicker';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { addDays, todayISO } from '@/lib/dates';
import { goBack } from '@/lib/navigation';
import { useNumberParam } from '@/lib/params';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const PRIORITIES: Priority[] = ['high', 'normal', 'low'];
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export default function TaskScreen() {
  const id = useNumberParam('id');
  const task = useTask(id);

  if (task.isPending || task.isError) {
    return (
      <Screen>
        <Header title={fr.task.editTitle} />
        {task.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={task.error.message} onRetry={() => task.refetch()} />
        )}
      </Screen>
    );
  }
  return <TaskEditor task={task.data} />;
}

function TaskEditor({ task }: { task: Task }) {
  const theme = useTheme();
  const save = useSaveTask(task.id);
  const remove = useDeleteTask();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [goal, setGoal] = useState(task.goal);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [plannedDate, setPlannedDate] = useState(task.planned_date);
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [minutes, setMinutes] = useState(task.estimated_minutes?.toString() ?? '');
  const [missingTitle, setMissingTitle] = useState(false);

  const apiError = save.error instanceof ApiError ? save.error : null;
  const today = todayISO();
  const dateShortcuts = [
    { label: fr.dates.today, value: today },
    { label: fr.dates.tomorrow, value: addDays(today, 1) },
  ];

  const submit = () => {
    setMissingTitle(!title.trim());
    if (!title.trim()) return;
    const parsedMinutes = Number.parseInt(minutes, 10);
    save.mutate(
      {
        title: title.trim(),
        notes,
        goal,
        due_date: dueDate,
        planned_date: plannedDate,
        priority,
        status,
        estimated_minutes: Number.isNaN(parsedMinutes) ? null : parsedMinutes,
      },
      { onSuccess: () => goBack() },
    );
  };

  return (
    <Screen>
      <Header
        title={fr.task.editTitle}
        right={
          <IconButton icon="trash-outline" label={fr.common.delete} color={theme.danger} onPress={() => setConfirmDelete(true)} />
        }
      />
      <View style={styles.form}>
        <TextField
          label={fr.task.title}
          value={title}
          onChangeText={setTitle}
          errors={[...(missingTitle ? [fr.common.required] : []), ...(apiError?.fieldErrors('title') ?? [])]}
        />
        <GoalPicker
          label={fr.task.goal}
          value={goal}
          onChange={setGoal}
          noneLabel={fr.task.noGoal}
          errors={apiError?.fieldErrors('goal')}
        />
        {goal === null ? <AppText variant="small">{fr.task.whyHint}</AppText> : null}
        <ChipSelect
          label={fr.task.status}
          options={STATUSES.map((s) => ({ value: s, label: fr.taskStatus[s] }))}
          value={status}
          onChange={setStatus}
        />
        <ChipSelect
          label={fr.task.priority}
          options={PRIORITIES.map((p) => ({ value: p, label: fr.priority[p] }))}
          value={priority}
          onChange={setPriority}
        />
        <DateField
          label={fr.task.plannedDate}
          value={plannedDate}
          onChange={setPlannedDate}
          shortcuts={dateShortcuts}
          clearable
          errors={apiError?.fieldErrors('planned_date')}
        />
        <DateField
          label={fr.task.dueDate}
          value={dueDate}
          onChange={setDueDate}
          shortcuts={dateShortcuts}
          clearable
          errors={apiError?.fieldErrors('due_date')}
        />
        <TextField
          label={fr.task.estimatedMinutes}
          value={minutes}
          onChangeText={setMinutes}
          inputMode="numeric"
          errors={apiError?.fieldErrors('estimated_minutes')}
        />
        <TextField label={fr.task.notes} value={notes} onChangeText={setNotes} multiline numberOfLines={4} />
        {save.isError && !apiError ? (
          <AppText color={theme.danger} accessibilityRole="alert">
            {save.error.message}
          </AppText>
        ) : null}
        <Button label={fr.common.save} onPress={submit} loading={save.isPending} />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title={fr.common.confirmDelete}
        message={task.title}
        confirmLabel={fr.common.delete}
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(task.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              if (router.canGoBack()) router.back();
              else router.replace('/');
            },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
