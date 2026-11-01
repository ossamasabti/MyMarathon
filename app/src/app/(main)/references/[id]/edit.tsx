
import { useReference, useSaveReference } from '@/api/references';
import { Header } from '@/components/Header';
import { ReferenceForm } from '@/components/ReferenceForm';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';
import { useNumberParam } from '@/lib/params';

export default function EditReferenceScreen() {
  const id = useNumberParam('id');
  const reference = useReference(id);
  const save = useSaveReference(id);
  const fallback = { pathname: '/references/[id]', params: { id: String(id) } } as const;

  return (
    <Screen>
      <Header title={fr.reference.editTitle} fallbackHref="/references" />
      {reference.isPending ? (
        <LoadingState />
      ) : reference.isError ? (
        <ErrorState message={reference.error.message} onRetry={() => reference.refetch()} />
      ) : (
        <ReferenceForm
          initial={reference.data}
          pending={save.isPending}
          error={save.error}
          onSubmit={(input) => save.mutate(input, { onSuccess: () => goBack(fallback) })}
        />
      )}
    </Screen>
  );
}
