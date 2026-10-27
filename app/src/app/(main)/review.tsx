import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function ReviewScreen() {
  return (
    <Screen title={fr.nav.review}>
      <EmptyState message={fr.screens.review.empty} />
    </Screen>
  );
}
