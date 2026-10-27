import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function StatsScreen() {
  return (
    <Screen title={fr.nav.stats}>
      <EmptyState message={fr.screens.stats.empty} />
    </Screen>
  );
}
