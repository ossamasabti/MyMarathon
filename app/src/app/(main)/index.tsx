import { useTodayTasks } from '@/api/tasks';
import type { Task } from '@/api/types';
import { AppText } from '@/components/AppText';
import { QuickAddTask } from '@/components/QuickAddTask';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TaskRow } from '@/components/TaskRow';
import { fr } from '@/i18n/fr';
import { todayISO } from '@/lib/dates';
import { useTheme } from '@/theme/useTheme';

export default function TodayScreen() {
  const today = useTodayTasks();

  return (
    <Screen title={fr.nav.today}>
      <Section>
        <QuickAddTask plannedDate={todayISO()} placeholder={fr.task.quickAddPlaceholder} />
      </Section>

      {today.isPending ? (
        <LoadingState />
      ) : today.isError ? (
        <ErrorState message={today.error.message} onRetry={() => today.refetch()} />
      ) : today.data.overdue.length + today.data.today.length + today.data.done.length === 0 ? (
        <EmptyState message={fr.screens.today.empty} hint={fr.task.whyHint} />
      ) : (
        <>
          <TaskSection title={fr.screens.today.overdue} tasks={today.data.overdue} danger />
          <TaskSection title={fr.screens.today.planned} tasks={today.data.today} />
          <TaskSection title={fr.screens.today.done} tasks={today.data.done} />
        </>
      )}
    </Screen>
  );
}

function TaskSection({ title, tasks, danger = false }: { title: string; tasks: Task[]; danger?: boolean }) {
  const theme = useTheme();
  if (tasks.length === 0) return null;
  return (
    <Section
      title={title}
      right={
        <AppText variant="small" color={danger ? theme.danger : undefined}>
          {tasks.length}
        </AppText>
      }>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </Section>
  );
}
