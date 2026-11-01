import { router } from 'expo-router';

import { useSaveReference } from '@/api/references';
import { Header } from '@/components/Header';
import { ReferenceForm } from '@/components/ReferenceForm';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';
import { useNumberParam } from '@/lib/params';

/** Add a reference; `?goal=` prefills the linked goal. */
export default function NewReferenceScreen() {
  const goal = useNumberParam('goal');
  const save = useSaveReference();
  return (
    <Screen>
      <Header title={fr.reference.newTitle} fallbackHref="/references" />
      <ReferenceForm
        defaultGoal={Number.isNaN(goal) ? null : goal}
        pending={save.isPending}
        error={save.error}
        onSubmit={(input) =>
          save.mutate(input, {
            onSuccess: (ref) => router.replace({ pathname: '/references/[id]', params: { id: String(ref.id) } }),
          })
        }
      />
    </Screen>
  );
}
