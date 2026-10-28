import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useLiveTimeSpent, useStartFocusOnTask } from '@/api/focus';
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
import { discardFocus, MIN_COUNTED_SECONDS, syncFocus } from '@/lib/focusSync';
import { useNumberParam } from '@/lib/params';
import { formatClock, formatDuration, formatTimeOfDay } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import {
  focusClockMs,
  focusedMs,
  focusedSeconds,
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

/** The task passed as `?task=`, when there is one. */
function useParamTask() {
  const taskParam = useNumberParam('task');
  return { requested: Number.isFinite(taskParam), query: useTask(taskParam) };
}

// --- Before starting ------------------------------------------------------------

function FocusSetup() {
  const { requested, query } = useParamTask();
  if (requested && (query.isPending || query.isError)) {
    return query.isPending ? (
      <LoadingState />
    ) : (
      <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
    );
  }
  // Remount the form when the task changes so its defaults (timer length) follow.
  const initial = requested ? (query.data ?? null) : null;
  return <SetupForm key={initial?.id ?? 'free'} initialTask={initial} />;
}

function SetupForm({ initialTask }: { initialTask: Task | null }) {
  const theme = useTheme();
  const startFree = useFocusStore((s) => s.start);
  const startOnTask = useStartFocusOnTask();
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
    const planned = mode === 'timer' ? parsedMinutes : null;
    const task = taskId === null ? undefined : choices.get(taskId);
    if (task) startOnTask(task, mode, planned);
    else startFree({ mode, taskId: null, taskTitle: null, plannedMinutes: planned });
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

// --- During and after a session -------------------------------------------------

function RunningSession({ session }: { session: ActiveFocusSession }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { pause, resume, stop } = useFocusStore();
  const syncError = useFocusStore((s) => s.syncError);
  const running = session.pausedAt === null && session.endedAt === null;
  const now = useNow(running);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);

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
      {session.taskId !== null ? <TaskTotal taskId={session.taskId} /> : null}
      {syncError ? (
        <AppText variant="small" color={theme.danger} accessibilityRole="alert">
          {fr.focus.syncError}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {session.pausedAt !== null ? (
          <Button label={fr.focus.resume} onPress={resume} />
        ) : (
          <Button label={fr.focus.pause} variant="secondary" onPress={pause} />
        )}
        <Button label={fr.focus.stop} onPress={() => stop()} />
      </View>
      <Button label={fr.focus.discard} variant="ghost" onPress={() => setConfirmDiscard(true)} />

      <SwitchTaskNotice session={session} />
      <FinishDialog session={session} />
      <ConfirmDialog
        visible={confirmDiscard}
        title={fr.focus.discardTitle}
        message={fr.focus.discardMessage}
        confirmLabel={fr.focus.discard}
        loading={discarding}
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setDiscarding(true);
          discardFocus(queryClient)
            .catch(() => useFocusStore.getState().setSyncError(true))
            .finally(() => {
              setDiscarding(false);
              setConfirmDiscard(false);
            });
        }}
      />
    </View>
  );
}

/** "Total sur la tâche", ticking with the session. */
function TaskTotal({ taskId }: { taskId: number }) {
  const task = useTask(taskId);
  if (!task.data) return null;
  return <LiveTotal task={task.data} />;
}

function LiveTotal({ task }: { task: Task }) {
  const seconds = useLiveTimeSpent(task);
  return <AppText>{fr.focus.taskTotal(formatDuration(seconds))}</AppText>;
}

/** Opened with `?task=` for another task while a session runs: offer to switch. */
function SwitchTaskNotice({ session }: { session: ActiveFocusSession }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const startOnTask = useStartFocusOnTask();
  const { requested, query } = useParamTask();
  const [switching, setSwitching] = useState(false);
  const target = requested ? query.data : undefined;
  if (!target || target.id === session.taskId || session.endedAt !== null) return null;

  const switchTask = async () => {
    setSwitching(true);
    useFocusStore.getState().stop();
    await syncFocus(queryClient);
    setSwitching(false);
    if (useFocusStore.getState().syncError) return;
    startOnTask(target);
  };

  return (
    <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
      <AppText>{fr.focus.switchNotice(target.title)}</AppText>
      <Button label={fr.focus.switchTo(target.title)} onPress={() => void switchTask()} loading={switching} />
    </View>
  );
}

function FinishDialog({ session }: { session: ActiveFocusSession }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const clear = useFocusStore((s) => s.clear);
  const syncError = useFocusStore((s) => s.syncError);
  const toggle = useToggleTask();
  const [markDone, setMarkDone] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (session.endedAt === null) return null;
  const seconds = focusedSeconds(session, session.endedAt);
  const counted = seconds >= MIN_COUNTED_SECONDS;
  const saved = !counted || (session.syncedSeconds ?? 0) === seconds;
  const timerDone = session.mode === 'timer' && seconds >= (session.plannedMinutes ?? 0) * 60;

  const close = () => {
    if (markDone && session.taskId !== null) toggle.mutate({ id: session.taskId, done: true });
    clear();
  };
  const retry = () => {
    setRetrying(true);
    void syncFocus(queryClient).finally(() => setRetrying(false));
  };

  return (
    <Dialog visible title={timerDone ? fr.focus.timeUp : fr.focus.finished} onClose={() => undefined}>
      <AppText>
        {!counted
          ? fr.focus.tooShort
          : session.taskTitle
            ? fr.focus.addedToTask(formatDuration(seconds), session.taskTitle)
            : fr.focus.summary(formatDuration(seconds))}
      </AppText>
      <AppText variant="small">
        {fr.focus.span(formatTimeOfDay(new Date(session.startedAt)), formatTimeOfDay(new Date(session.endedAt)))}
      </AppText>
      {counted && session.taskId !== null ? <TaskTotal taskId={session.taskId} /> : null}
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
      {syncError && !saved ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {fr.focus.syncError}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        {syncError && !saved ? <Button label={fr.common.retry} variant="secondary" onPress={retry} loading={retrying} /> : null}
        <Button label={fr.common.close} onPress={close} loading={!saved && !syncError} disabled={!saved} />
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
  notice: {
    width: '100%',
    maxWidth: 520,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
