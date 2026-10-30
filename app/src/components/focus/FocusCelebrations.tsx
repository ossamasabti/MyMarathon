import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFocusOverview } from '@/api/focus';
import type { FocusOverview } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { fr } from '@/i18n/fr';
import { useFocusStore } from '@/stores/focusStore';
import { usePrefsStore } from '@/stores/prefsStore';
import { spacing } from '@/theme/colors';

import { BadgeTile } from './FocusProgress';

/**
 * Celebrates the daily goal (once a day) and newly unlocked badges. Waits until no session is
 * running so it never interrupts focus; shown during a break or after the end-of-session review.
 */
export function FocusCelebrations() {
  const overview = useFocusOverview();
  if (!overview.data) return null;
  return <Celebrations overview={overview.data} />;
}

function Celebrations({ overview }: { overview: FocusOverview }) {
  const busy = useFocusStore((s) => s.session !== null);
  const seenBadges = usePrefsStore((s) => s.seenBadges);
  const celebratedGoalDay = usePrefsStore((s) => s.celebratedGoalDay);
  const unlocked = overview.badges.filter((b) => b.unlocked);

  // First load on this device: badges earned before are not "new".
  useEffect(() => {
    if (seenBadges === null) usePrefsStore.getState().setSeenBadges(unlocked.map((b) => b.key));
  }, [seenBadges, unlocked]);

  if (busy || seenBadges === null) return null;
  const newBadges = unlocked.filter((b) => !seenBadges.includes(b.key));
  const goalReached = overview.today_seconds >= overview.goal_minutes * 60 && celebratedGoalDay !== overview.today;
  if (!goalReached && newBadges.length === 0) return null;

  const close = () => {
    const prefs = usePrefsStore.getState();
    prefs.setSeenBadges(unlocked.map((b) => b.key));
    if (goalReached) prefs.setCelebratedGoalDay(overview.today);
  };

  return (
    <Dialog
      visible
      title={goalReached ? fr.focus.celebrateGoalTitle : fr.focus.newBadgeTitle(newBadges.length)}
      onClose={close}>
      <View style={styles.content}>
        {goalReached ? <AppText>{fr.focus.celebrateGoalBody(overview.streak)}</AppText> : null}
        {goalReached && newBadges.length > 0 ? (
          <AppText variant="heading">{fr.focus.newBadgeTitle(newBadges.length)}</AppText>
        ) : null}
        {newBadges.length > 0 ? (
          <View style={styles.badges}>
            {newBadges.map((badge) => (
              <BadgeTile key={badge.key} badge={badge} />
            ))}
          </View>
        ) : null}
        <Button label={fr.common.close} onPress={close} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
