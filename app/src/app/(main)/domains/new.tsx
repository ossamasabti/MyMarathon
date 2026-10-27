import { router } from 'expo-router';

import { useSaveDomain } from '@/api/domains';
import { DomainForm } from '@/components/DomainForm';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function NewDomainScreen() {
  const save = useSaveDomain();
  return (
    <Screen>
      <Header title={fr.domain.newTitle} fallbackHref="/goals" />
      <DomainForm
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
