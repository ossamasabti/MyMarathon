import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function GoalTreeScreen() {
  return (
    <Screen title={fr.nav.goals}>
      <EmptyState message={fr.screens.goals.empty} />
    </Screen>
  );
}
