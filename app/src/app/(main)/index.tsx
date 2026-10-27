import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function TodayScreen() {
  return (
    <Screen title={fr.nav.today}>
      <EmptyState message={fr.screens.today.empty} />
    </Screen>
  );
}
