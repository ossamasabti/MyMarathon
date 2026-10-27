import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useDomains } from '@/api/domains';
import { useGoals } from '@/api/goals';
import type { Horizon } from '@/api/types';
import { AppText } from '@/components/AppText';
import { DomainDot } from '@/components/Badge';
import { ChipSelect } from '@/components/ChipSelect';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { Timeline } from '@/components/Timeline';
import { fr } from '@/i18n/fr';
import { yearBounds } from '@/lib/calendar';
import { HORIZONS } from '@/lib/horizons';
import { spacing } from '@/theme/colors';
import { useIsWide } from '@/theme/useTheme';

type HorizonFilter = Horizon | 'all';

export default function TimelineScreen() {
  const params = useLocalSearchParams<{ year?: string }>();
  const parsedYear = Number(params.year);
  const year = Number.isInteger(parsedYear) && parsedYear > 1900 ? parsedYear : new Date().getFullYear();
  const [from, to] = yearBounds(year);
  const wide = useIsWide();

  const goals = useGoals({ active_from: from, active_to: to });
  const domains = useDomains();
  const [horizon, setHorizon] = useState<HorizonFilter>('all');
  const [domain, setDomain] = useState<number | null>(null);

  // The year lives in the URL so that reloads and links keep it.
  const showYear = (next: number) => router.setParams({ year: String(next) });

  const visible = (goals.data ?? []).filter(
    (g) => (horizon === 'all' || g.horizon === horizon) && (domain === null || g.domain === domain),
  );
  const domainList = domains.data ?? [];
  const usedDomains = domainList.filter((d) => (goals.data ?? []).some((g) => g.domain === d.id));

  return (
    <Screen title={fr.nav.timeline} fullWidth={wide}>
      <View style={styles.toolbar}>
        <IconButton icon="chevron-back" label={fr.screens.timeline.previous} onPress={() => showYear(year - 1)} />
        <AppText variant="heading" accessibilityLiveRegion="polite">
          {year}
        </AppText>
        <IconButton icon="chevron-forward" label={fr.screens.timeline.next} onPress={() => showYear(year + 1)} />
      </View>

      <ChipSelect<HorizonFilter>
        label={fr.screens.timeline.horizon}
        options={[
          { value: 'all', label: fr.screens.timeline.all },
          ...HORIZONS.map((h) => ({ value: h, label: fr.horizon[h] })),
        ]}
        value={horizon}
        onChange={setHorizon}
      />
      {domainList.length ? (
        <ChipSelect<number | null>
          label={fr.screens.timeline.domain}
          options={[
            { value: null, label: fr.screens.timeline.allDomains },
            ...domainList.map((d) => ({ value: d.id, label: d.name, color: d.color })),
          ]}
          value={domain}
          onChange={setDomain}
        />
      ) : null}

      {goals.isPending || domains.isPending ? (
        <LoadingState />
      ) : goals.isError ? (
        <ErrorState message={goals.error.message} onRetry={() => goals.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState message={fr.screens.timeline.empty} hint={fr.screens.timeline.emptyHint} />
      ) : (
        <>
          <Timeline year={year} goals={visible} domains={domainList} />
          {usedDomains.length ? (
            <View style={styles.legend} accessibilityLabel={fr.screens.timeline.legend}>
              {usedDomains.map((d) => (
                <View key={d.id} style={styles.legendItem}>
                  <DomainDot color={d.color} />
                  <AppText variant="small">{d.name}</AppText>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
