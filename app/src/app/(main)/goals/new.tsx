import { router } from 'expo-router';

import { useDomains } from '@/api/domains';
import { useGoals, useSaveGoal } from '@/api/goals';
import { GoalForm } from '@/components/GoalForm';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { useNumberParam } from '@/lib/params';

/** Create a goal; `?parent=` and `?domain=` prefill the form. */
export default function NewGoalScreen() {
  const parent = useNumberParam('parent');
  const domain = useNumberParam('domain');
  const goals = useGoals();
  const domains = useDomains();
  const save = useSaveGoal();

  return (
    <Screen>
      <Header title={fr.goal.newTitle} fallbackHref="/goals" />
      {goals.isPending || domains.isPending ? (
        <LoadingState />
      ) : goals.isError ? (
        <ErrorState message={goals.error.message} onRetry={() => goals.refetch()} />
      ) : (
        <GoalForm
          defaultParent={Number.isNaN(parent) ? null : parent}
          defaultDomain={Number.isNaN(domain) ? null : domain}
          pending={save.isPending}
          error={save.error}
          onSubmit={(input) =>
            save.mutate(input, {
              onSuccess: (goal) => router.replace({ pathname: '/goals/[id]', params: { id: String(goal.id) } }),
            })
          }
        />
      )}
    </Screen>
  );
}
