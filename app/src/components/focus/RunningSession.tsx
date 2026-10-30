import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useLiveTimeSpent, useStartFocusOnTask } from '@/api/focus';
import { useTask, useToggleTask } from '@/api/tasks';
import type { Task } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ChipSelect } from '@/components/ChipSelect';
import { ConfirmDialog, Dialog } from '@/components/Dialog';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { positionInSet } from '@/lib/focusMethods';
import { discardFocus, isFocusSaved, MIN_COUNTED_SECONDS, syncFocus } from '@/lib/focusSync';
import { formatClock, formatDuration, formatTimeOfDay } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import {
  focusClockMs,
  focusedMs,
  focusedSeconds,
  timerCompleted,
  timerMs,
  useFocusStore,
  type ActiveFocusSession,
} from '@/stores/focusStore';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { SessionReview } from './SessionReview';

const MAX_NOTE_LENGTH = 200;

/** Title of a session: method and cycle position, or the timer length, or the stopwatch. */
export function sessionLabel(session: ActiveFocusSession): string {
  if (session.cycle) {
    const { position, size } = positionInSet(session.cycle.method, session.cycle.index);
    return fr.focus.cycleLabel(fr.focus.methods[session.cycle.method], position, size);
  }
  return session.mode === 'timer' ? fr.focus.timerOf(session.plannedMinutes ?? 0) : fr.focus.stopwatch;
}

export function RunningSession({ session, paramTask }: { session: ActiveFocusSession; paramTask: Task | null }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { pause, resume, stop } = useFocusStore();
  const syncError = useFocusStore((s) => s.syncError);
  const running = session.pausedAt === null && session.endedAt === null;
  const now = useNow(running);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [noting, setNoting] = useState(false);

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
        {sessionLabel(session)}
        {session.taskTitle ? ` · ${session.taskTitle}` : ''}
      </AppText>
      {session.intention ? (
        <AppText variant="heading" style={styles.center}>
          {session.intention}
        </AppText>
      ) : null}
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
      {session.endedAt === null ? (
        <Button
          label={fr.focus.distractionButton(session.distractions)}
          variant="secondary"
          onPress={() => setNoting(true)}
        />
      ) : null}
      <Button label={fr.focus.discard} variant="ghost" onPress={() => setConfirmDiscard(true)} />

      <SwitchTaskNotice session={session} target={paramTask} />
      <FinishDialog session={session} />
      <DistractionDialog visible={noting} onClose={() => setNoting(false)} />
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

/** "Distraction": jot the thought down (or not), count it, and get back to work. */
function DistractionDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [note, setNote] = useState('');
  const save = () => {
    useFocusStore.getState().addDistraction(note);
    setNote('');
    onClose();
  };
  return (
    <Dialog visible={visible} title={fr.focus.distractionTitle} onClose={onClose}>
      <View style={styles.dialogBody}>
        <AppText variant="small">{fr.focus.distractionHint}</AppText>
        <TextField
          label={fr.focus.distractionNote}
          value={note}
          onChangeText={setNote}
          maxLength={MAX_NOTE_LENGTH}
          onSubmitEditing={save}
          autoFocus
        />
        <View style={styles.dialogActions}>
          <Button label={fr.common.cancel} variant="secondary" onPress={onClose} />
          <Button label={fr.focus.distractionSave} onPress={save} />
        </View>
      </View>
    </Dialog>
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
function SwitchTaskNotice({ session, target }: { session: ActiveFocusSession; target: Task | null }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const startOnTask = useStartFocusOnTask();
  const [switching, setSwitching] = useState(false);
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
  const completed = timerCompleted(session);
  const saved = isFocusSaved(session);
  // A completed cycle moves on to its break (and its review) once saved.
  if (session.cycle && completed && !syncError) return null;
  const seconds = focusedSeconds(session, session.endedAt);
  const counted = seconds >= MIN_COUNTED_SECONDS;

  const close = () => {
    if (markDone && session.taskId !== null) toggle.mutate({ id: session.taskId, done: true });
    clear();
  };
  const retry = () => {
    setRetrying(true);
    void syncFocus(queryClient).finally(() => setRetrying(false));
  };

  return (
    <Dialog visible title={completed ? fr.focus.timeUp : fr.focus.finished} onClose={() => undefined}>
      <View style={styles.dialogBody}>
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
        <SessionReview
          serverId={counted && saved ? session.serverId : null}
          intention={session.intention}
          distractions={session.distractions}
          capturedNotes={session.capturedNotes}
        />
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
        <View style={styles.dialogActions}>
          {syncError && !saved ? (
            <Button label={fr.common.retry} variant="secondary" onPress={retry} loading={retrying} />
          ) : null}
          <Button label={fr.common.close} onPress={close} loading={!saved && !syncError} disabled={!saved} />
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  running: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  center: { textAlign: 'center' },
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
  dialogBody: { gap: spacing.md },
  dialogActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm },
  notice: {
    width: '100%',
    maxWidth: 520,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
