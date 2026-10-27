import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function TimelineScreen() {
  return (
    <Screen title={fr.nav.timeline}>
      <EmptyState message={fr.screens.timeline.empty} />
    </Screen>
  );
}
