import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useSaveFocusSession } from '@/api/focus';
import { useTask, useTodayTasks, useToggleTask } from '@/api/tasks';
import type { FocusMode, Task } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { ConfirmDialog, Dialog } from '@/components/Dialog';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { useNumberParam } from '@/lib/params';
import { formatClock, formatDuration, formatTimeOfDay } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import {
  focusClockMs,
  focusedMs,
  timerMs,
  useFocusStore,
  type ActiveFocusSession,
} from '@/stores/focusStore';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

const TIMER_PRESETS = [25, 45, 60] as const;
const MAX_TIMER_MINUTES = 600;

export default function FocusScreen() {
  const session = useFocusStore((s) => s.session);
  return (
    <Screen>
      <Header title={fr.focus.title} />
      {session ? <RunningSession session={session} /> : <FocusSetup />}
    </Screen>
  );
}

// --- Before starting ------------------------------------------------------------

function FocusSetup() {
  const taskParam = useNumberParam('task');
  const fromParam = Number.isFinite(taskParam);
  const paramTask = useTask(taskParam);

  if (fromParam && (paramTask.isPending || paramTask.isError)) {
    return paramTask.isPending ? (
      <LoadingState />
    ) : (
      <ErrorState message={paramTask.error.message} onRetry={() => paramTask.refetch()} />
    );
  }
  // Remount the form when the task changes so its defaults (timer length) follow.
  const initial = fromParam ? (paramTask.data ?? null) : null;
  return <SetupForm key={initial?.id ?? 'free'} initialTask={initial} />;
}

function SetupForm({ initialTask }: { initialTask: Task | null }) {
  const theme = useTheme();
  const start = useFocusStore((s) => s.start);
  const today = useTodayTasks();
  const [taskId, setTaskId] = useState<number | null>(initialTask?.id ?? null);
  const [mode, setMode] = useState<FocusMode>(initialTask?.estimated_minutes ? 'timer' : 'stopwatch');
  const [minutes, setMinutes] = useState(String(initialTask?.estimated_minutes ?? TIMER_PRESETS[0]));

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
  const canStart = mode === 'stopwatch' || minutesValid;

  const begin = () => {
    if (!canStart) return;
    start({
      mode,
      taskId,
      taskTitle: taskId === null ? null : (choices.get(taskId)?.title ?? null),
      plannedMinutes: mode === 'timer' ? parsedMinutes : null,
    });
  };

  return (
    <View style={styles.form}>
      <AppText variant="muted">{fr.focus.intro}</AppText>
      <ChipSelect label={fr.focus.task} options={taskOptions} value={taskId} onChange={setTaskId} />
      <ChipSelect
        label={fr.focus.mode}
        options={[
          { value: 'stopwatch' as const, label: fr.focus.stopwatch },
          { value: 'timer' as const, label: fr.focus.timer },
        ]}
        value={mode}
        onChange={setMode}
      />
      <AppText variant="small">{mode === 'stopwatch' ? fr.focus.stopwatchHint : fr.focus.timerHint}</AppText>
      {mode === 'timer' ? (
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
      <Button label={fr.focus.start} onPress={begin} disabled={!canStart} />
      {Platform.OS === 'web' ? (
        <AppText variant="small" color={theme.textMuted}>
          {fr.focus.webHint}
        </AppText>
      ) : null}
    </View>
  );
}

// --- During and after a session -------------------------------------------------

function RunningSession({ session }: { session: ActiveFocusSession }) {
  const theme = useTheme();
  const { pause, resume, stop, clear } = useFocusStore();
  const running = session.pausedAt === null && session.endedAt === null;
  const now = useNow(running);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const clock = formatClock(focusClockMs(session, now));
  const length = timerMs(session);
  const progress = length === null ? null : Math.min(1, focusedMs(session, now) / length);

  // Desktop / web: the time stays visible in the window title.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const previous = document.title;
    document.title = `${clock} · ${fr.focus.title}`;
    return () => {
      document.title = previous;
    };
  }, [clock]);

  return (
    <View style={styles.running}>
      <AppText variant="muted">
        {session.mode === 'timer' ? fr.focus.timerOf(session.plannedMinutes ?? 0) : fr.focus.stopwatch}
        {session.taskTitle ? ` · ${session.taskTitle}` : ''}
      </AppText>
      <AppText
        style={[styles.clock, { color: running ? theme.text : theme.textMuted }]}
        accessibilityRole="timer"
        accessibilityLabel={session.mode === 'timer' ? fr.focus.remainingLabel(clock) : fr.focus.elapsedLabel(clock)}>
        {clock}
      </AppText>
      {progress !== null ? (
        <View
          style={[styles.track, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
        </View>
      ) : null}
      <AppText variant="small">
        {fr.focus.startedAt(formatTimeOfDay(new Date(session.startedAt)))}
        {session.pausedAt !== null ? ` · ${fr.focus.paused}` : ''}
      </AppText>

      <View style={styles.actions}>
        {session.pausedAt !== null ? (
          <Button label={fr.focus.resume} onPress={resume} />
        ) : (
          <Button label={fr.focus.pause} variant="secondary" onPress={pause} />
        )}
        <Button label={fr.focus.stop} onPress={() => stop()} />
      </View>
      <Button label={fr.focus.discard} variant="ghost" onPress={() => setConfirmDiscard(true)} />

      <FinishDialog session={session} />
      <ConfirmDialog
        visible={confirmDiscard}
        title={fr.focus.discardTitle}
        message={fr.focus.discardMessage}
        confirmLabel={fr.focus.discard}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          clear();
        }}
      />
    </View>
  );
}

function FinishDialog({ session }: { session: ActiveFocusSession }) {
  const theme = useTheme();
  const clear = useFocusStore((s) => s.clear);
  const save = useSaveFocusSession();
  const toggle = useToggleTask();
  const [markDone, setMarkDone] = useState(false);

  if (session.endedAt === null) return null;
  const endedAt = session.endedAt;
  const seconds = Math.round(focusedMs(session, endedAt) / 1000);
  const timerDone = session.mode === 'timer' && seconds >= (session.plannedMinutes ?? 0) * 60;
  const apiError = save.error instanceof ApiError ? save.error : null;
  const errors = apiError
    ? Object.values(apiError.body ?? {}).flatMap((v) => (Array.isArray(v) ? v.map(String) : []))
    : [];

  const submit = () =>
    save.mutate(
      {
        task: session.taskId,
        mode: session.mode,
        started_at: new Date(session.startedAt).toISOString(),
        ended_at: new Date(endedAt).toISOString(),
        duration_seconds: seconds,
        planned_minutes: session.plannedMinutes,
      },
      {
        onSuccess: () => {
          if (markDone && session.taskId !== null) toggle.mutate({ id: session.taskId, done: true });
          clear();
        },
      },
    );

  return (
    <Dialog visible title={timerDone ? fr.focus.timeUp : fr.focus.finished} onClose={() => undefined}>
      <AppText>{fr.focus.summary(formatDuration(seconds))}</AppText>
      <AppText variant="small">
        {fr.focus.span(formatTimeOfDay(new Date(session.startedAt)), formatTimeOfDay(new Date(endedAt)))}
      </AppText>
      {session.taskId !== null ? (
        <ChipSelect
          label={session.taskTitle ?? fr.focus.task}
          options={[
            { value: 'keep' as const, label: fr.focus.keepTask },
            { value: 'done' as const, label: fr.focus.markDone },
          ]}
          value={markDone ? 'done' : 'keep'}
          onChange={(v) => setMarkDone(v === 'done')}
        />
      ) : null}
      {seconds < 1 ? <AppText color={theme.danger}>{fr.focus.tooShort}</AppText> : null}
      {errors.length || (save.isError && !apiError) ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {errors.length ? errors.join(' ') : save.error?.message}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button label={fr.focus.dontSave} variant="secondary" onPress={clear} />
        <Button label={fr.focus.save} onPress={submit} loading={save.isPending} disabled={seconds < 1} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  running: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  clock: { fontSize: 72, lineHeight: 84, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: {
    width: '100%',
    maxWidth: 420,
    height: 10,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fill: { height: '100%', borderRadius: radius.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
});
