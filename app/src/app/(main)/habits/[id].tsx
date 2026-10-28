import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { useDeleteHabit, useHabit, useSaveHabit } from '@/api/habits';
import type { Habit } from '@/api/types';
import { AppText } from '@/components/AppText';
import { ConfirmDialog } from '@/components/Dialog';
import { HabitForm } from '@/components/HabitForm';
import { HabitHistory } from '@/components/HabitHistory';
import { frequencyLabel, streakLabel } from '@/components/HabitRow';
import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';
import { useNumberParam } from '@/lib/params';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

export default function HabitScreen() {
  const id = useNumberParam('id');
  const habit = useHabit(id);

  if (habit.isPending || habit.isError) {
    const notFound = habit.error instanceof ApiError && habit.error.status === 404;
    return (
      <Screen>
        <Header title={fr.habit.editTitle} />
        {habit.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState
            message={notFound ? fr.habit.notFound : habit.error.message}
            onRetry={notFound ? undefined : () => habit.refetch()}
          />
        )}
      </Screen>
    );
  }
  return <HabitDetail habit={habit.data} />;
}

function HabitDetail({ habit }: { habit: Habit }) {
  const theme = useTheme();
  const save = useSaveHabit(habit.id);
  const remove = useDeleteHabit();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const streak = streakLabel(habit);
  const rate = habit.completion_30d === null ? null : Math.round(habit.completion_30d * 100);

  return (
    <Screen>
      <Header
        title={habit.title}
        right={
          <IconButton icon="trash-outline" label={fr.common.delete} color={theme.danger} onPress={() => setConfirmDelete(true)} />
        }
      />

      <Section>
        <AppText variant="muted">{frequencyLabel(habit)}</AppText>
        <View style={styles.stats}>
          {streak ? <AppText>{streak}</AppText> : null}
          {rate !== null ? <AppText>{fr.habit.rate30(rate)}</AppText> : null}
        </View>
      </Section>

      <Section title={fr.habit.history}>
        <HabitHistory habit={habit} />
      </Section>

      <Section title={fr.habit.editTitle}>
        <HabitForm
          initial={habit}
          pending={save.isPending}
          error={save.error}
          onSubmit={(input) => save.mutate(input, { onSuccess: () => goBack('/') })}
        />
      </Section>

      <ConfirmDialog
        visible={confirmDelete}
        title={fr.common.confirmDelete}
        message={fr.habit.deleteWarning}
        confirmLabel={fr.common.delete}
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(habit.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              if (router.canGoBack()) router.back();
              else router.replace('/');
            },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
});
