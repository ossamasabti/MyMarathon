import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useLiveTimeSpent, useStartFocusOnTask } from '@/api/focus';
import { useToggleTask } from '@/api/tasks';
import type { Task } from '@/api/types';
import { fr } from '@/i18n/fr';
import { formatDate } from '@/lib/dates';
import { formatDuration, formatSlot } from '@/lib/time';
import { useFocusStore } from '@/stores/focusStore';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DomainDot } from './Badge';
import { CheckMark } from './CheckMark';

interface TaskRowProps {
  task: Task;
  /** Hide the goal path (e.g. inside the goal's own detail screen). */
  hideGoal?: boolean;
  /** Extra controls under the task (e.g. "move" buttons in the week view). */
  footer?: ReactNode;
}

/** A task with its checkbox and, underneath, the goal it serves. */
export function TaskRow({ task, hideGoal = false, footer }: TaskRowProps) {
  const theme = useTheme();
  const display = useDomainColor();
  const toggle = useToggleTask();
  const done = task.status === 'done';
  const directGoal = task.goal_path[task.goal_path.length - 1];
  const slot = formatSlot(task.start_time, task.end_time);
  const spent = useLiveTimeSpent(task);
  const startFocus = useStartFocusOnTask();
  const hasSession = useFocusStore((s) => s.session !== null);
  const focusing = useFocusStore((s) => s.session?.taskId === task.id && s.session.endedAt === null);

  const onFocusPress = () => {
    // A session already exists (maybe on another task): the focus screen shows it and offers to switch.
    if (!hasSession) startFocus(task);
    router.push({ pathname: '/focus', params: { task: String(task.id) } });
  };

  return (
    <View
      style={[
        styles.row,
        // Colored edge = the task's domain (the goal path below names it).
        { borderBottomColor: theme.border, borderLeftColor: task.domain ? display(task.domain.color) : 'transparent' },
      ]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? fr.task.markTodo(task.title) : fr.task.markDone(task.title)}
        onPress={() => toggle.mutate({ id: task.id, done: !done })}
        style={({ pressed }) => [styles.check, pressed && { opacity: 0.6 }]}>
        <CheckMark
          checked={done}
          checkedIcon="checkmark-circle"
          uncheckedIcon="ellipse-outline"
          checkedColor={theme.success}
          uncheckedColor={theme.textMuted}
        />
      </Pressable>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: String(task.id) } })}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}>
        <View style={styles.titleRow}>
          {slot ? (
            <AppText variant="small" color={theme.primary} style={styles.slot} accessibilityLabel={fr.task.slotLabel(slot)}>
              {slot}
            </AppText>
          ) : null}
          {task.priority === 'high' ? (
            <Ionicons name="flag" size={14} color={theme.danger} accessibilityLabel={fr.priority.high} />
          ) : null}
          <AppText
            style={[styles.title, done && { textDecorationLine: 'line-through', color: theme.textMuted }]}
            numberOfLines={2}>
            {task.title}
          </AppText>
        </View>
        {hideGoal ? null : (
          <View style={styles.goalRow}>
            {task.domain ? <DomainDot color={task.domain.color} size={8} /> : null}
            <AppText variant="small" numberOfLines={1} style={styles.goalText}>
              {directGoal ? task.goal_path.map((g) => g.title).join(' › ') : fr.task.noGoal}
            </AppText>
          </View>
        )}
        {task.due_date ? (
          <AppText variant="small">{fr.dates.due(formatDate(task.due_date))}</AppText>
        ) : null}
        {spent >= 60 ? (
          <View style={styles.spentRow} accessibilityLabel={fr.focus.spentLabel(formatDuration(spent))}>
            <Ionicons name="time-outline" size={14} color={focusing ? theme.primary : theme.textMuted} />
            <AppText variant="small" color={focusing ? theme.primary : undefined}>
              {formatDuration(spent)}
            </AppText>
          </View>
        ) : null}
      </Pressable>
      {done ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={focusing ? fr.focus.openRunning(task.title) : fr.focus.startOnRow(task.title)}
          onPress={onFocusPress}
          style={({ pressed }) => [styles.check, pressed && { opacity: 0.6 }]}>
          <Ionicons
            name={focusing ? 'timer' : 'play-circle-outline'}
            size={26}
            color={focusing ? theme.primary : theme.textMuted}
          />
        </Pressable>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    paddingLeft: spacing.xs,
  },
  check: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: MIN_TOUCH, justifyContent: 'center', paddingVertical: spacing.xs, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1, fontWeight: '500' },
  slot: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  goalText: { flex: 1 },
  spentRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
});
