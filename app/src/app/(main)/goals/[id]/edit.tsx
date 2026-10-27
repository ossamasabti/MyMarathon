import { useDomains } from '@/api/domains';
import { useGoal, useGoals, useSaveGoal } from '@/api/goals';
import { GoalForm } from '@/components/GoalForm';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';
import { useNumberParam } from '@/lib/params';

export default function EditGoalScreen() {
  const id = useNumberParam('id');
  const goal = useGoal(id);
  const goals = useGoals();
  const domains = useDomains();
  const save = useSaveGoal(id);

  return (
    <Screen>
      <Header title={fr.goal.editTitle} fallbackHref="/goals" />
      {goal.isPending || goals.isPending || domains.isPending ? (
        <LoadingState />
      ) : goal.isError ? (
        <ErrorState message={goal.error.message} onRetry={() => goal.refetch()} />
      ) : (
        <GoalForm
          initial={goal.data}
          pending={save.isPending}
          error={save.error}
          onSubmit={(input) => save.mutate(input, { onSuccess: () => goBack('/goals') })}
        />
      )}
    </Screen>
  );
}
