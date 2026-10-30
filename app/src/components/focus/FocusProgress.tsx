import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFocusOverview } from '@/api/focus';
import type { FocusBadge, FocusBadgeKey, FocusOverview } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Section } from '@/components/Section';
import { StatTile } from '@/components/StatTile';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { formatFocusTotal } from '@/lib/time';
import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

export const BADGE_ICONS: Record<FocusBadgeKey, ComponentProps<typeof Ionicons>['name']> = {
  first_session: 'footsteps',
  hours_1: 'hourglass',
  hours_10: 'hourglass',
  hours_50: 'hourglass',
  hours_100: 'medal',
  streak_3: 'flame',
  streak_7: 'flame',
  streak_30: 'flame',
  streak_100: 'bonfire',
  timers_10: 'timer',
  timers_50: 'stopwatch',
  deep_work: 'water',
  top_quality_10: 'star',
  early_bird: 'sunny',
};

/** Records and badges, under the focus setup form. */
export function FocusProgress() {
  const overview = useFocusOverview();
  return (
    <Section title={fr.focus.progressTitle}>
      {overview.isPending ? (
        <LoadingState />
      ) : overview.isError ? (
        <ErrorState message={overview.error.message} onRetry={() => overview.refetch()} />
      ) : (
        <ProgressContent overview={overview.data} />
      )}
    </Section>
  );
}

function ProgressContent({ overview }: { overview: FocusOverview }) {
  const { records } = overview;
  const unlocked = overview.badges.filter((b) => b.unlocked).length;
  return (
    <>
      <View style={styles.tiles}>
        <StatTile label={fr.focus.currentStreak} value={fr.focus.days(overview.streak)} />
        <StatTile label={fr.focus.bestStreak} value={fr.focus.days(overview.best_streak)} />
        <StatTile
          label={fr.focus.bestDay}
          value={records.best_day ? formatFocusTotal(records.best_day.seconds) : '—'}
        />
        <StatTile label={fr.focus.totalTime} value={formatFocusTotal(records.total_seconds)} />
      </View>
      <View style={styles.badgesHeader}>
        <AppText variant="heading" style={styles.flex}>
          {fr.focus.badgesTitle}
        </AppText>
        <AppText variant="small">{fr.focus.badgesCount(unlocked, overview.badges.length)}</AppText>
      </View>
      <View style={styles.badges}>
        {overview.badges.map((badge) => (
          <BadgeTile key={badge.key} badge={badge} />
        ))}
      </View>
      <Button label={fr.focus.seeStats} variant="ghost" onPress={() => router.push('/stats')} />
    </>
  );
}

export function BadgeTile({ badge }: { badge: FocusBadge }) {
  const theme = useTheme();
  const { name, description } = fr.focus.badges[badge.key];
  return (
    <View
      accessible
      accessibilityLabel={
        badge.unlocked
          ? fr.focus.badgeUnlockedLabel(name, description)
          : fr.focus.badgeLockedLabel(name, description, badge.progress, badge.target)
      }
      style={[
        styles.badge,
        {
          backgroundColor: badge.unlocked ? theme.primarySoft : theme.surface,
          borderColor: badge.unlocked ? theme.primary : theme.border,
        },
      ]}>
      <Ionicons
        name={badge.unlocked ? BADGE_ICONS[badge.key] : 'lock-closed-outline'}
        size={28}
        color={badge.unlocked ? theme.primary : theme.textMuted}
      />
      <AppText style={styles.badgeName} color={theme.text} numberOfLines={2}>
        {name}
      </AppText>
      <AppText variant="small" style={styles.center} numberOfLines={3}>
        {badge.unlocked ? description : fr.focus.badgeProgress(badge.progress, badge.target)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    width: 140,
    flexGrow: 1,
    maxWidth: 200,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  badgeName: { fontWeight: '600', textAlign: 'center' },
  center: { textAlign: 'center' },
  flex: { flex: 1 },
});
