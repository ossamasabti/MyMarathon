import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useToggleTask } from '@/api/tasks';
import type { GoalNode, TreeTask } from '@/api/types';
import { fr } from '@/i18n/fr';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DomainDot, HorizonBadge } from './Badge';
import { ProgressBar } from './ProgressBar';

/** Collapsible vision → annual → quarterly → monthly → tasks tree. */
export function GoalTree({ nodes }: { nodes: GoalNode[] }) {
  // Deeper levels start collapsed so the long-term view stays readable.
  const [toggled, setToggled] = useState<Set<number>>(new Set());
  const flip = (id: number) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <View>
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} toggled={toggled} onToggle={flip} />
      ))}
    </View>
  );
}

interface TreeNodeProps {
  node: GoalNode;
  depth: number;
  toggled: Set<number>;
  onToggle: (id: number) => void;
}

function TreeNode({ node, depth, toggled, onToggle }: TreeNodeProps) {
  const theme = useTheme();
  const hasContent = node.children.length > 0 || node.tasks.length > 0;
  const openByDefault = depth < 1;
  const expanded = hasContent && openByDefault !== toggled.has(node.id);
  const dimmed = node.status === 'abandoned' || node.status === 'paused';

  return (
    <View style={[styles.node, depth > 0 && { marginLeft: spacing.md, borderLeftColor: theme.border, borderLeftWidth: 1 }]}>
      <View style={styles.header}>
        {hasContent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={
              expanded ? fr.screens.goals.collapse(node.title) : fr.screens.goals.expand(node.title)
            }
            onPress={() => onToggle(node.id)}
            style={styles.chevron}>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.chevron} />
        )}
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/goals/[id]', params: { id: String(node.id) } })}
          style={({ pressed }) => [styles.body, pressed && { opacity: 0.7 }, dimmed && { opacity: 0.6 }]}>
          <View style={styles.titleRow}>
            {node.domain ? <DomainDot color={node.domain.color} /> : null}
            <AppText style={styles.title} numberOfLines={2}>
              {node.title}
            </AppText>
            <HorizonBadge horizon={node.horizon} />
          </View>
          <ProgressBar
            value={node.progress}
            late={node.is_late}
            achieved={node.status === 'achieved'}
            color={node.domain?.color}
          />
        </Pressable>
      </View>

      {expanded ? (
        <View>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} toggled={toggled} onToggle={onToggle} />
          ))}
          {node.tasks.map((task) => (
            <TreeTaskRow key={task.id} task={task} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TreeTaskRow({ task }: { task: TreeTask }) {
  const theme = useTheme();
  const toggle = useToggleTask();
  const done = task.status === 'done';
  return (
    <View style={[styles.task, { borderLeftColor: theme.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? fr.task.markTodo(task.title) : fr.task.markDone(task.title)}
        onPress={() => toggle.mutate({ id: task.id, done: !done })}
        style={styles.chevron}>
        <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? theme.success : theme.textMuted} />
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: String(task.id) } })}
        style={styles.body}>
        <AppText
          variant="small"
          color={done ? theme.textMuted : theme.text}
          style={done && { textDecorationLine: 'line-through' }}>
          {task.title}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  node: { paddingLeft: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  chevron: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingVertical: spacing.sm, gap: spacing.xs, minHeight: MIN_TOUCH, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontWeight: '600' },
  task: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.md,
    borderLeftWidth: 1,
  },
});
