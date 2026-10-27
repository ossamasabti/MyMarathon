import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function WeekScreen() {
  return (
    <Screen title={fr.nav.week}>
      <EmptyState message={fr.screens.week.empty} />
    </Screen>
  );
}
