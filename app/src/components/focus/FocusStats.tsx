import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFocusOverview } from '@/api/focus';
import type { FocusOverview } from '@/api/types';
import { AppText } from '@/components/AppText';
import { DomainDot } from '@/components/Badge';
import { ColumnChart } from '@/components/ColumnChart';
import { Section } from '@/components/Section';
import { StatTile } from '@/components/StatTile';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { formatDate } from '@/lib/dates';
import { formatFocusTotal } from '@/lib/time';
import { heatmapColors, MIN_TOUCH, spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useColorSchemeName, useTheme } from '@/theme/useTheme';

const CELL = 18;
const CELL_GAP = 3;
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** "Concentration" section of the statistics screen. */
export function FocusStats() {
  const overview = useFocusOverview();
  return (
    <Section title={fr.focus.stats.title}>
      {overview.isPending ? (
        <LoadingState />
      ) : overview.isError ? (
        <ErrorState message={overview.error.message} onRetry={() => overview.refetch()} />
      ) : overview.data.records.sessions === 0 ? (
        <EmptyState message={fr.focus.stats.empty} />
      ) : (
        <StatsContent overview={overview.data} />
      )}
    </Section>
  );
}

function StatsContent({ overview }: { overview: FocusOverview }) {
  const quality = overview.quality_avg_30d;
  return (
    <>
      <View style={styles.tiles}>
        <StatTile icon="flame" highlight label={fr.focus.currentStreak} value={fr.focus.days(overview.streak)} />
        <StatTile
          icon="sparkles"
          label={fr.focus.stats.qualityAvg}
          value={quality === null ? '—' : fr.focus.stats.qualityValue(quality.toFixed(1).replace('.', ','))}
        />
      </View>
      <AppText variant="heading">{fr.focus.stats.heatmap}</AppText>
      <Heatmap overview={overview} />
      <AppText variant="heading">{fr.focus.stats.hours}</AppText>
      <HourColumns byHour={overview.by_hour} />
      <AppText variant="heading">{fr.focus.stats.byDomain}</AppText>
      <DomainTime rows={overview.by_domain} />
    </>
  );
}

/** Calendar heatmap: one column per week, Monday on top; darkest = daily goal reached. */
function Heatmap({ overview }: { overview: FocusOverview }) {
  const theme = useTheme();
  const ramp = heatmapColors[useColorSchemeName()];
  const [selected, setSelected] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const goal = overview.goal_minutes * 60;

  const level = (seconds: number): number => {
    if (seconds <= 0) return -1;
    const ratio = seconds / goal;
    return ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : ratio >= 0.25 ? 1 : 0;
  };
  const weeks: (typeof overview.heatmap)[] = [];
  overview.heatmap.forEach((cell, index) => {
    const week = Math.floor(index / 7);
    (weeks[week] ??= []).push(cell);
  });
  const readout = overview.heatmap.find((c) => c.date === selected) ?? overview.heatmap[overview.heatmap.length - 1];
  const describe = (cell: { date: string; seconds: number }) =>
    fr.focus.stats.heatmapDay(formatDate(cell.date), formatFocusTotal(cell.seconds));
  const activeDays = overview.heatmap.filter((c) => c.seconds > 0);

  return (
    <View style={styles.chart}>
      <AppText variant="small" color={theme.text} accessibilityLiveRegion="polite">
        {readout ? describe(readout) : ''}
      </AppText>
      <View style={styles.heatmap}>
        <View style={styles.weekdays}>
          {WEEKDAY_LABELS.map((label, index) => (
            <AppText key={index} variant="small" style={styles.weekday}>
              {/* Monday, Wednesday, Friday only, to keep it light. */}
              {index % 2 === 0 && index < 6 ? label : ''}
            </AppText>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0]?.date} style={styles.week}>
            {week.map((cell) => {
              const step = level(cell.seconds);
              return (
                <Pressable
                  key={cell.date}
                  accessibilityRole="button"
                  accessibilityLabel={describe(cell)}
                  onPress={() => setSelected(cell.date === selected ? null : cell.date)}
                  onHoverIn={() => setSelected(cell.date)}
                  onHoverOut={() => setSelected(null)}
                  hitSlop={2}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: step < 0 ? theme.surfaceAlt : ramp[step],
                      borderColor: cell.date === selected ? theme.text : 'transparent',
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppText variant="small">{fr.focus.stats.less}</AppText>
        <View style={[styles.cell, { backgroundColor: theme.surfaceAlt }]} />
        {ramp.map((color) => (
          <View key={color} style={[styles.cell, { backgroundColor: color }]} />
        ))}
        <AppText variant="small">{fr.focus.stats.more}</AppText>
      </View>
      <AppText variant="small">{fr.focus.stats.legendHint}</AppText>
      <Pressable accessibilityRole="button" onPress={() => setShowTable((v) => !v)} style={styles.toggle}>
        <AppText variant="small" color={theme.primary}>
          {showTable ? fr.screens.stats.hideTable : fr.screens.stats.showTable}
        </AppText>
      </Pressable>
      {showTable ? (
        <View accessibilityRole="list">
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <AppText variant="small" style={styles.flex}>
              {fr.focus.stats.dayColumn}
            </AppText>
            <AppText variant="small">{fr.focus.stats.durationColumn}</AppText>
          </View>
          {activeDays.map((cell) => (
            <View key={cell.date} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
              <AppText style={styles.flex}>{formatDate(cell.date)}</AppText>
              <AppText>{formatFocusTotal(cell.seconds)}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Focus by clock hour over 30 days, the best hour in the accent. */
function HourColumns({ byHour }: { byHour: number[] }) {
  const minutes = byHour.map((seconds) => Math.round(seconds / 60));
  const best = Math.max(...minutes);
  const bestHour = best > 0 ? minutes.indexOf(best) : -1;
  return (
    <>
      <AppText variant="small">{fr.focus.stats.hoursUnit}</AppText>
      <ColumnChart
        bars={minutes.map((value, hour) => ({
          key: String(hour),
          value,
          axisLabel: hour % 3 === 0 ? `${hour}h` : '',
          description: fr.focus.stats.hourBar(hour, formatFocusTotal(value * 60)),
          tableLabel: `${hour} h`,
        }))}
        accentIndex={bestHour >= 0 ? bestHour : null}
        labelledIndexes={bestHour >= 0 ? [bestHour] : []}
        defaultIndex={Math.max(bestHour, 0)}
        formatValue={(value) => formatFocusTotal(value * 60)}
        summary={bestHour >= 0 ? fr.focus.stats.hoursSummary(bestHour) : ''}
        tableHeaders={[fr.focus.stats.hourColumn, fr.focus.stats.durationColumn]}
      />
    </>
  );
}

function DomainTime({ rows }: { rows: FocusOverview['by_domain'] }) {
  const theme = useTheme();
  const display = useDomainColor();
  const max = Math.max(...rows.map((r) => r.seconds), 1);
  if (rows.length === 0) return <AppText variant="small">{fr.focus.stats.empty}</AppText>;
  return (
    <View style={styles.domains}>
      {rows.map((row) => {
        const name = row.domain?.name ?? fr.focus.stats.noDomain;
        const value = formatFocusTotal(row.seconds);
        return (
          <View key={row.domain?.id ?? 'none'} accessible accessibilityLabel={`${name} : ${value}`} style={styles.domainRow}>
            <View style={styles.domainHeader}>
              {row.domain ? <DomainDot color={row.domain.color} /> : null}
              <AppText style={styles.flex} numberOfLines={1}>
                {name}
              </AppText>
              {/* Value in text color, never the series color. */}
              <AppText variant="small" color={theme.text}>
                {value}
              </AppText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${(row.seconds / max) * 100}%`,
                    backgroundColor: row.domain ? display(row.domain.color) : theme.textMuted,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chart: { gap: spacing.sm },
  heatmap: { flexDirection: 'row', gap: CELL_GAP },
  weekdays: { gap: CELL_GAP, marginRight: spacing.xs },
  weekday: { height: CELL, lineHeight: CELL, fontSize: 11 },
  week: { gap: CELL_GAP },
  cell: { width: CELL, height: CELL, borderRadius: 4, borderWidth: 1.5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: CELL_GAP },
  toggle: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  tableRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  domains: { gap: spacing.sm },
  domainRow: { gap: spacing.xs },
  domainHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { height: 12, borderRadius: 4, overflow: 'hidden' },
  // Rounded data end, square at the baseline.
  fill: { height: '100%', borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  flex: { flex: 1 },
});
