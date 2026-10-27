import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function DomainScreen() {
  return (
    <Screen title={fr.screens.domain.title}>
      <EmptyState message={fr.screens.domain.empty} />
    </Screen>
  );
}
