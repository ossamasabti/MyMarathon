import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useStats } from '@/api/stats';
import type { Stats } from '@/api/types';
import { AppText } from '@/components/AppText';
import { DomainDot, HorizonBadge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { StatTile } from '@/components/StatTile';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { WeeklyColumns } from '@/components/WeeklyColumns';
import { fr } from '@/i18n/fr';
import { formatDuration } from '@/lib/time';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useTheme } from '@/theme/useTheme';

const percent = (value: number) => Math.round(value * 100);

export default function StatsScreen() {
  const stats = useStats();

  return (
    <Screen title={fr.nav.stats}>
      {stats.isPending ? (
        <LoadingState />
      ) : stats.isError ? (
        <ErrorState message={stats.error.message} onRetry={() => stats.refetch()} />
      ) : (
        <StatsContent stats={stats.data} />
      )}
    </Screen>
  );
}

function StatsContent({ stats }: { stats: Stats }) {
  const { totals } = stats;
  const nothingYet =
    stats.domains.length === 0 &&
    totals.tasks_done_30d === 0 &&
    totals.focus_seconds_30d === 0 &&
    stats.weekly_tasks.every((w) => w.count === 0);
  if (nothingYet) return <EmptyState message={fr.screens.stats.empty} />;

  return (
    <>
      <View style={styles.tiles}>
        <StatTile label={fr.screens.stats.tasksDone30} value={String(totals.tasks_done_30d)} />
        <StatTile label={fr.screens.stats.achieved} value={String(totals.goals_achieved)} />
        <StatTile
          label={fr.screens.stats.habitsRate}
          value={totals.habits_rate_30d === null ? '—' : `${percent(totals.habits_rate_30d)} %`}
        />
        <StatTile label={fr.screens.stats.focus30} value={formatDuration(totals.focus_seconds_30d)} />
      </View>

      <Section title={fr.screens.stats.byDomain}>
        {stats.domains.length === 0 ? (
          <EmptyState message={fr.screens.stats.byDomainEmpty} />
        ) : (
          stats.domains.map((domain) => <DomainRow key={domain.id ?? 'none'} domain={domain} />)
        )}
      </Section>

      <Section title={fr.screens.stats.weekly}>
        <AppText variant="small">{fr.screens.stats.weeklySubtitle}</AppText>
        <WeeklyColumns weeks={stats.weekly_tasks} />
      </Section>

      <Section title={fr.screens.stats.late}>
        {stats.late_goals.length === 0 ? (
          <EmptyState message={fr.screens.stats.lateEmpty} />
        ) : (
          stats.late_goals.map((goal) => <LateGoalRow key={goal.id} goal={goal} />)
        )}
      </Section>
    </>
  );
}

function DomainRow({ domain }: { domain: Stats['domains'][number] }) {
  const theme = useTheme();
  const display = useDomainColor();
  const value = domain.progress;
  const content = (
    <>
      <View style={styles.domainHeader}>
        {domain.color ? <DomainDot color={domain.color} /> : null}
        <AppText style={styles.flex} numberOfLines={1}>
          {domain.name ?? fr.screens.stats.noDomain}
        </AppText>
        {/* Value at the bar tip, in text color (never the series color). */}
        <AppText variant="small" color={theme.text}>
          {value === null ? fr.screens.stats.noGoal : `${percent(value)} %`}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent(value ?? 0)}%`,
              backgroundColor: domain.color ? display(domain.color) : theme.textMuted,
            },
          ]}
        />
      </View>
      <AppText variant="small">{fr.screens.stats.domainDetail(domain.active, domain.late)}</AppText>
    </>
  );
  const label = `${domain.name ?? fr.screens.stats.noDomain} : ${
    value === null ? fr.screens.stats.noGoal : `${percent(value)} %`
  }`;
  if (domain.id === null) {
    return (
      <View accessible accessibilityLabel={label} style={styles.domainRow}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname: '/domains/[id]', params: { id: String(domain.id) } })}
      style={({ pressed }) => [styles.domainRow, pressed && { opacity: 0.7 }]}>
      {content}
    </Pressable>
  );
}

function LateGoalRow({ goal }: { goal: Stats['late_goals'][number] }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/goals/[id]', params: { id: String(goal.id) } })}
      style={({ pressed }) => [styles.lateRow, { borderBottomColor: theme.border }, pressed && { opacity: 0.7 }]}>
      <View style={styles.domainHeader}>
        {goal.domain_color ? <DomainDot color={goal.domain_color} /> : null}
        <AppText style={styles.flex} numberOfLines={2}>
          {goal.title}
        </AppText>
        <HorizonBadge horizon={goal.horizon} />
      </View>
      <ProgressBar value={goal.progress} late compact />
      <AppText variant="small">{fr.screens.stats.lateDetail(percent(goal.progress), percent(goal.expected))}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  domainRow: { gap: spacing.xs, paddingVertical: spacing.xs, minHeight: MIN_TOUCH },
  domainHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 12, borderRadius: 4, overflow: 'hidden' },
  // Rounded data end, square at the baseline.
  fill: { height: '100%', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  lateRow: { gap: spacing.xs, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
});
