import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTodayHabits } from '@/api/habits';
import { useTodayTasks } from '@/api/tasks';
import type { Task } from '@/api/types';
import { AppText } from '@/components/AppText';
import { FocusTodayCard } from '@/components/focus/FocusTodayCard';
import { HabitRow } from '@/components/HabitRow';
import { QuickAddTask } from '@/components/QuickAddTask';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TaskRow } from '@/components/TaskRow';
import { TodayHero } from '@/components/TodayHero';
import { fr } from '@/i18n/fr';
import { todayISO } from '@/lib/dates';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

export default function TodayScreen() {
  const today = useTodayTasks();
  const habits = useTodayHabits();

  return (
    <Screen>
      <TodayHero />
      <FocusTodayCard />

      <Section>
        <QuickAddTask plannedDate={todayISO()} placeholder={fr.task.quickAddPlaceholder} />
      </Section>

      <Section title={fr.habit.today} icon="repeat">
        {habits.isPending ? (
          <LoadingState />
        ) : habits.isError ? (
          <ErrorState message={habits.error.message} onRetry={() => habits.refetch()} />
        ) : habits.data.length === 0 ? (
          <EmptyState message={fr.habit.todayEmpty} hint={fr.habit.todayHint} icon="leaf-outline" />
        ) : (
          habits.data.map((habit) => <HabitRow key={habit.id} habit={habit} />)
        )}
      </Section>

      {today.isPending ? (
        <LoadingState />
      ) : today.isError ? (
        <ErrorState message={today.error.message} onRetry={() => today.refetch()} />
      ) : today.data.overdue.length + today.data.today.length + today.data.done.length === 0 ? (
        <EmptyState message={fr.screens.today.empty} hint={fr.task.whyHint} icon="sunny-outline" />
      ) : (
        <>
          <TaskSection title={fr.screens.today.overdue} icon="alert-circle-outline" tasks={today.data.overdue} danger />
          <TaskSection title={fr.screens.today.planned} icon="rocket-outline" tasks={today.data.today} />
          <TaskSection title={fr.screens.today.done} icon="trophy-outline" tasks={today.data.done} />
        </>
      )}
    </Screen>
  );
}

interface TaskSectionProps {
  title: string;
  icon: ComponentProps<typeof Section>['icon'];
  tasks: Task[];
  danger?: boolean;
}

function TaskSection({ title, icon, tasks, danger = false }: TaskSectionProps) {
  const theme = useTheme();
  if (tasks.length === 0) return null;
  return (
    <Section
      title={title}
      icon={icon}
      right={
        <View style={[styles.count, { backgroundColor: danger ? theme.danger : theme.primarySoft }]}>
          <AppText variant="small" color={danger ? theme.onPrimary : theme.primary} style={styles.countText}>
            {tasks.length}
          </AppText>
        </View>
      }>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  count: { minWidth: 28, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, alignItems: 'center' },
  countText: { fontWeight: '700' },
});
