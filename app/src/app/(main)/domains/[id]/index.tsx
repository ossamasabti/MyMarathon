import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDeleteDomain, useDomains } from '@/api/domains';
import { useGoalTree } from '@/api/goals';
import { useTasks } from '@/api/tasks';
import type { Domain } from '@/api/types';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/Dialog';
import { GoalTree } from '@/components/GoalTree';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TaskRow } from '@/components/TaskRow';
import { fr } from '@/i18n/fr';
import { useNumberParam } from '@/lib/params';
import { useTheme } from '@/theme/useTheme';

export default function DomainScreen() {
  const id = useNumberParam('id');
  const domains = useDomains();
  const domain = domains.data?.find((d) => d.id === id);

  if (domains.isPending || domains.isError || !domain) {
    return (
      <Screen>
        <Header title={fr.domain.title} fallbackHref="/goals" />
        {domains.isPending ? (
          <LoadingState />
        ) : domains.isError ? (
          <ErrorState message={domains.error.message} onRetry={() => domains.refetch()} />
        ) : (
          <ErrorState message={fr.domain.notFound} />
        )}
      </Screen>
    );
  }
  return <DomainDetail domain={domain} />;
}

function DomainDetail({ domain }: { domain: Domain }) {
  const theme = useTheme();
  const tree = useGoalTree(domain.id);
  const tasks = useTasks({ domain: domain.id });
  const remove = useDeleteDomain();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Screen>
      <Header
        title={domain.name}
        fallbackHref="/goals"
        right={
          <>
            <IconButton
              icon="create-outline"
              label={fr.common.edit}
              onPress={() => router.push({ pathname: '/domains/[id]/edit', params: { id: String(domain.id) } })}
            />
            <IconButton icon="trash-outline" label={fr.common.delete} color={theme.danger} onPress={() => setConfirmDelete(true)} />
          </>
        }
      />
      <View style={[styles.stripe, { backgroundColor: domain.color }]} />

      <Section
        title={fr.domain.goals}
        right={
          <Button
            label={`+ ${fr.goal.add}`}
            variant="ghost"
            onPress={() => router.push({ pathname: '/goals/new', params: { domain: String(domain.id) } })}
          />
        }>
        {tree.isPending ? (
          <LoadingState />
        ) : tree.isError ? (
          <ErrorState message={tree.error.message} onRetry={() => tree.refetch()} />
        ) : tree.data.length === 0 ? (
          <EmptyState message={fr.domain.noGoals} />
        ) : (
          <GoalTree nodes={tree.data} />
        )}
      </Section>

      <Section title={fr.domain.tasks}>
        {tasks.isPending ? (
          <LoadingState />
        ) : tasks.isError ? (
          <ErrorState message={tasks.error.message} onRetry={() => tasks.refetch()} />
        ) : tasks.data.length === 0 ? (
          <EmptyState message={fr.domain.noTasks} />
        ) : (
          tasks.data.map((task) => <TaskRow key={task.id} task={task} />)
        )}
      </Section>

      <ConfirmDialog
        visible={confirmDelete}
        title={fr.common.confirmDelete}
        message={fr.domain.deleteWarning}
        confirmLabel={fr.common.delete}
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(domain.id, {
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
  stripe: { height: 6, borderRadius: 3 },
});
