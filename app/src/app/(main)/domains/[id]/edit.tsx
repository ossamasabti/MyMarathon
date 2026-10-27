import { useDomains, useSaveDomain } from '@/api/domains';
import { DomainForm } from '@/components/DomainForm';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { goBack } from '@/lib/navigation';
import { useNumberParam } from '@/lib/params';

export default function EditDomainScreen() {
  const id = useNumberParam('id');
  const domains = useDomains();
  const save = useSaveDomain(id);
  const domain = domains.data?.find((d) => d.id === id);

  return (
    <Screen>
      <Header title={fr.domain.editTitle} fallbackHref="/goals" />
      {domains.isPending ? (
        <LoadingState />
      ) : domains.isError ? (
        <ErrorState message={domains.error.message} onRetry={() => domains.refetch()} />
      ) : !domain ? (
        <ErrorState message={fr.domain.notFound} />
      ) : (
        <DomainForm
          initial={domain}
          pending={save.isPending}
          error={save.error}
          onSubmit={(input) => save.mutate(input, { onSuccess: () => goBack('/goals') })}
        />
      )}
    </Screen>
  );
}
