import { router } from 'expo-router';

import { useDomains, useSaveDomain } from '@/api/domains';
import { DomainForm } from '@/components/DomainForm';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function NewDomainScreen() {
  const save = useSaveDomain();
  const domains = useDomains();
  return (
    <Screen>
      <Header title={fr.domain.newTitle} fallbackHref="/goals" />
      <DomainForm
        // Remount once the existing domains are known, so the default color skips taken ones.
        key={domains.data ? 'ready' : 'loading'}
        usedColors={domains.data?.map((d) => d.color)}
        pending={save.isPending}
        error={save.error}
        onSubmit={(input) =>
          save.mutate(input, {
            onSuccess: (domain) => router.replace({ pathname: '/domains/[id]', params: { id: String(domain.id) } }),
          })
        }
      />
    </Screen>
  );
}
