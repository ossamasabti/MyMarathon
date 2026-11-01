import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useDomains } from '@/api/domains';
import { useDeleteGoal, useGoal, useGoals, useSaveGoal } from '@/api/goals';
import { useHabits, useSaveHabit } from '@/api/habits';
import { useReferences } from '@/api/references';
import { useTasks } from '@/api/tasks';
import type { Goal, GoalStatus } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Badge, DomainDot, HorizonBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ConfirmDialog, Dialog } from '@/components/Dialog';
import { HabitForm } from '@/components/HabitForm';
import { HabitRow } from '@/components/HabitRow';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { QuickAddTask } from '@/components/QuickAddTask';
import { Screen } from '@/components/Screen';
import { ReferenceRow } from '@/components/ReferenceRow';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TaskRow } from '@/components/TaskRow';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';
import { formatRange, todayISO } from '@/lib/dates';
import { formatDecimal } from '@/lib/numbers';
import { useNumberParam } from '@/lib/params';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

export default function GoalDetailScreen() {
  const id = useNumberParam('id');
  const goal = useGoal(id);

  if (goal.isPending) {
    return (
      <Screen>
        <Header title={fr.nav.goals} fallbackHref="/goals" />
        <LoadingState />
      </Screen>
    );
  }
  if (goal.isError) {
    const notFound = goal.error instanceof ApiError && goal.error.status === 404;
    return (
      <Screen>
        <Header title={fr.nav.goals} fallbackHref="/goals" />
        <ErrorState
          message={notFound ? fr.goal.notFound : goal.error.message}
          onRetry={notFound ? undefined : () => goal.refetch()}
        />
      </Screen>
    );
  }
  return <GoalDetail goal={goal.data} />;
}

function GoalDetail({ goal }: { goal: Goal }) {
  const theme = useTheme();
  const domains = useDomains();
  const children = useGoals({ parent: goal.id });
  const tasks = useTasks({ goal: goal.id });
  const save = useSaveGoal(goal.id);
  const remove = useDeleteGoal();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addingHabit, setAddingHabit] = useState(false);
  const habits = useHabits({ goal: goal.id });
  const references = useReferences({ goal: goal.id });
  const saveHabit = useSaveHabit();
  const [current, setCurrent] = useState(formatDecimal(goal.current_value));

  const domain = domains.data?.find((d) => d.id === goal.domain);
  const achieved = goal.status === 'achieved';
  const setStatus = (status: GoalStatus) => save.mutate({ status });
  const canHaveChildren = goal.horizon !== 'monthly';

  return (
    <Screen>
      <Header
        title={goal.title}
        fallbackHref="/goals"
        right={
          <>
            <IconButton
              icon="create-outline"
              label={fr.common.edit}
              onPress={() => router.push({ pathname: '/goals/[id]/edit', params: { id: String(goal.id) } })}
            />
            <IconButton icon="trash-outline" label={fr.common.delete} color={theme.danger} onPress={() => setConfirmDelete(true)} />
          </>
        }
      />

      {goal.ancestors.length ? (
        <View style={styles.breadcrumb}>
          {goal.ancestors.map((a, index) => (
            <View key={a.id} style={styles.breadcrumbItem}>
              {index > 0 ? <AppText variant="small">›</AppText> : null}
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/goals/[id]', params: { id: String(a.id) } })}
                style={styles.crumb}>
                <AppText variant="small" color={theme.primary}>
                  {a.title}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Section>
        <View style={styles.meta}>
          <HorizonBadge horizon={goal.horizon} />
          <Badge label={fr.goalStatus[goal.status]} />
          {domain ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/domains/[id]', params: { id: String(domain.id) } })}
              style={styles.domain}>
              <DomainDot color={domain.color} />
              <AppText variant="small" color={theme.text}>
                {domain.name}
              </AppText>
            </Pressable>
          ) : null}
        </View>
        <AppText variant="muted">{formatRange(goal.start_date, goal.end_date)}</AppText>
        {goal.description ? <AppText>{goal.description}</AppText> : null}
        <ProgressBar value={goal.progress} late={goal.is_late} achieved={achieved} color={domain?.color} />
        {goal.task_counts.total ? (
          <AppText variant="small">{fr.goal.taskCount(goal.task_counts.done, goal.task_counts.total)}</AppText>
        ) : null}

        {goal.target_value !== null ? (
          <View style={styles.indicator}>
            <View style={styles.flex}>
              <TextField
                label={`${fr.goal.currentValue} (${fr.goal.targetValue.toLowerCase()} : ${formatDecimal(goal.target_value)} ${goal.unit})`}
                value={current}
                onChangeText={setCurrent}
                inputMode="decimal"
              />
            </View>
            <Button
              label={fr.goal.updateIndicator}
              variant="secondary"
              loading={save.isPending}
              onPress={() => save.mutate({ current_value: current.trim() ? current.trim().replace(',', '.') : null })}
            />
          </View>
        ) : null}
        {save.isError ? (
          <AppText variant="small" color={theme.danger} accessibilityRole="alert">
            {save.error.message}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          {!achieved ? <Button label={`\u{1F3C1} ${fr.goal.markAchieved}`} onPress={() => setStatus('achieved')} /> : null}
          {goal.status === 'active' ? (
            <Button label={fr.goal.pause} variant="secondary" onPress={() => setStatus('paused')} />
          ) : (
            <Button label={fr.goal.resume} variant="secondary" onPress={() => setStatus('active')} />
          )}
          {goal.status !== 'abandoned' ? (
            <Button label={fr.goal.abandon} variant="ghost" onPress={() => setStatus('abandoned')} />
          ) : null}
        </View>
      </Section>

      {canHaveChildren ? (
        <Section
          title={fr.goal.children}
          right={
            <Button
              label={`+ ${fr.goal.addChild}`}
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: '/goals/new',
                  params: { parent: String(goal.id), ...(goal.domain ? { domain: String(goal.domain) } : {}) },
                })
              }
            />
          }>
          {children.isPending ? (
            <LoadingState />
          ) : children.isError ? (
            <ErrorState message={children.error.message} onRetry={() => children.refetch()} />
          ) : children.data.length === 0 ? (
            <EmptyState message={fr.goal.noChildren} />
          ) : (
            children.data.map((child) => (
              <Pressable
                key={child.id}
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/goals/[id]', params: { id: String(child.id) } })}
                style={({ pressed }) => [styles.child, { borderBottomColor: theme.border }, pressed && { opacity: 0.7 }]}>
                <View style={styles.childTitle}>
                  <AppText style={styles.flex} numberOfLines={2}>
                    {child.title}
                  </AppText>
                  <HorizonBadge horizon={child.horizon} />
                </View>
                <ProgressBar value={child.progress} late={child.is_late} achieved={child.status === 'achieved'} />
              </Pressable>
            ))
          )}
        </Section>
      ) : null}

      <Section title={fr.goal.tasks}>
        <QuickAddTask goalId={goal.id} plannedDate={todayISO()} />
        {tasks.isPending ? (
          <LoadingState />
        ) : tasks.isError ? (
          <ErrorState message={tasks.error.message} onRetry={() => tasks.refetch()} />
        ) : tasks.data.length === 0 ? (
          <EmptyState message={fr.goal.noTasks} />
        ) : (
          tasks.data.map((task) => <TaskRow key={task.id} task={task} hideGoal />)
        )}
      </Section>

      <Section
        title={fr.goal.habits}
        right={<Button label={`+ ${fr.habit.add}`} variant="ghost" onPress={() => setAddingHabit(true)} />}>
        {habits.isPending ? (
          <LoadingState />
        ) : habits.isError ? (
          <ErrorState message={habits.error.message} onRetry={() => habits.refetch()} />
        ) : habits.data.length === 0 ? (
          <EmptyState message={fr.habit.none} />
        ) : (
          habits.data.map((habit) => <HabitRow key={habit.id} habit={habit} hideGoal />)
        )}
      </Section>

      {references.data && references.data.length > 0 ? (
        <Section
          title={fr.reference.goalSection(references.data.length)}
          right={
            <Button
              label={`+ ${fr.reference.add}`}
              variant="ghost"
              onPress={() => router.push({ pathname: '/references/new', params: { goal: String(goal.id) } })}
            />
          }>
          {references.data.map((reference) => (
            <ReferenceRow key={reference.id} reference={reference} />
          ))}
        </Section>
      ) : null}

      <Dialog visible={addingHabit} title={fr.habit.newTitle} onClose={() => setAddingHabit(false)}>
        <ScrollView>
          <HabitForm
            defaultGoal={goal.id}
            pending={saveHabit.isPending}
            error={saveHabit.error}
            onSubmit={(input) => saveHabit.mutate(input, { onSuccess: () => setAddingHabit(false) })}
          />
        </ScrollView>
      </Dialog>

      <ConfirmDialog
        visible={confirmDelete}
        title={fr.common.confirmDelete}
        message={fr.goal.deleteWarning}
        confirmLabel={fr.common.delete}
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(goal.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              router.replace('/goals');
            },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  crumb: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  domain: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  indicator: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 160 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  child: { paddingVertical: spacing.sm, gap: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: MIN_TOUCH },
  childTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
