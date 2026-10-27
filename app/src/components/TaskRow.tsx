import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToggleTask } from '@/api/tasks';
import type { Task } from '@/api/types';
import { fr } from '@/i18n/fr';
import { formatDate } from '@/lib/dates';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DomainDot } from './Badge';

interface TaskRowProps {
  task: Task;
  /** Hide the goal path (e.g. inside the goal's own detail screen). */
  hideGoal?: boolean;
}

/** A task with its checkbox and, underneath, the goal it serves. */
export function TaskRow({ task, hideGoal = false }: TaskRowProps) {
  const theme = useTheme();
  const toggle = useToggleTask();
  const done = task.status === 'done';
  const directGoal = task.goal_path[task.goal_path.length - 1];

  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? fr.task.markTodo(task.title) : fr.task.markDone(task.title)}
        onPress={() => toggle.mutate({ id: task.id, done: !done })}
        style={({ pressed }) => [styles.check, pressed && { opacity: 0.6 }]}>
        <Ionicons
          name={done ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={done ? theme.success : theme.textMuted}
        />
      </Pressable>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: String(task.id) } })}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }]}>
        <View style={styles.titleRow}>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flex: 1 },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  goalText: { flex: 1 },
});
