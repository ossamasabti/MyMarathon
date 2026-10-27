import { EmptyState } from '@/components/States';
import { Screen } from '@/components/Screen';
import { fr } from '@/i18n/fr';

export default function GoalDetailScreen() {
  return (
    <Screen title={fr.screens.goalDetail.title}>
      <EmptyState message={fr.screens.goalDetail.empty} />
    </Screen>
  );
}
