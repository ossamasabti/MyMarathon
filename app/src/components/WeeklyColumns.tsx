import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ISODate } from '@/api/types';
import { fr } from '@/i18n/fr';
import { formatDate } from '@/lib/dates';
import { chartColors, MIN_TOUCH, spacing } from '@/theme/colors';
import { useColorSchemeName, useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

const CHART_HEIGHT = 160;
const MAX_BAR_WIDTH = 24;
const BAR_RADIUS = 4;

interface WeeklyColumnsProps {
  weeks: { week_start: ISODate; count: number }[];
}

/**
 * Single-series column chart (one blue ramp): past weeks in a lighter step, the current
 * week in the accent. Only the record and the current week carry a value label; any column
 * can be pressed/hovered to read its value, and a table view lists everything.
 */
export function WeeklyColumns({ weeks }: WeeklyColumnsProps) {
  const theme = useTheme();
  const colors = chartColors[useColorSchemeName()];
  const [selected, setSelected] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(...weeks.map((w) => w.count), 0);
  const top = niceCeil(Math.max(max, 1));
  const lastIndex = weeks.length - 1;
  const recordIndex = max > 0 ? weeks.findIndex((w) => w.count === max) : -1;
  const total = weeks.reduce((sum, w) => sum + w.count, 0);
  const focus = selected ?? lastIndex;
  const focusWeek = weeks[focus];

  return (
    <View style={styles.container}>
      {/* Readout of the pressed/hovered column (tooltip equivalent, also works on touch). */}
      <AppText variant="small" color={theme.text} accessibilityLiveRegion="polite">
        {focusWeek ? fr.screens.stats.weekBar(formatDate(focusWeek.week_start), focusWeek.count) : ''}
      </AppText>

      <View style={styles.plot}>
        <View style={styles.axis}>
          <AppText variant="small">{top}</AppText>
          <AppText variant="small">{top / 2}</AppText>
          <AppText variant="small">0</AppText>
        </View>
        <View style={styles.area}>
          {/* Recessive hairline grid: top, middle, baseline. */}
          {[0, 0.5, 1].map((f) => (
            <View key={f} style={[styles.gridLine, { top: f * CHART_HEIGHT, backgroundColor: colors.grid }]} />
          ))}
          <View style={styles.columns}>
            {weeks.map((week, index) => {
              const height = (week.count / top) * CHART_HEIGHT;
              const isCurrent = index === lastIndex;
              const labelled = index === lastIndex || index === recordIndex;
              const active = index === selected;
              return (
                <Pressable
                  key={week.week_start}
                  accessibilityRole="button"
                  accessibilityLabel={fr.screens.stats.weekBar(formatDate(week.week_start), week.count)}
                  onPress={() => setSelected(active ? null : index)}
                  onHoverIn={() => setSelected(index)}
                  onHoverOut={() => setSelected(null)}
                  style={styles.slot}>
                  {labelled && week.count > 0 ? (
                    <AppText variant="small" color={theme.text} style={styles.capLabel}>
                      {week.count}
                    </AppText>
                  ) : null}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, week.count > 0 ? 2 : 0),
                        backgroundColor: isCurrent ? colors.current : colors.past,
                        opacity: selected !== null && !active ? 0.55 : 1,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.xAxis}>
        {weeks.map((week, index) => (
          <AppText key={week.week_start} variant="small" style={styles.xLabel} numberOfLines={1}>
            {/* Every other week, to avoid colliding labels. */}
            {index % 2 === lastIndex % 2 ? formatDate(week.week_start) : ''}
          </AppText>
        ))}
      </View>

      <AppText variant="small">
        {fr.screens.stats.weeklySummary(total, max, weeks[lastIndex]?.count ?? 0)}
      </AppText>

      <Pressable accessibilityRole="button" onPress={() => setShowTable((v) => !v)} style={styles.toggle}>
        <AppText variant="small" color={theme.primary}>
          {showTable ? fr.screens.stats.hideTable : fr.screens.stats.showTable}
        </AppText>
      </Pressable>
      {showTable ? (
        <View accessibilityRole="list">
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <AppText variant="small" style={styles.flex}>
              {fr.screens.stats.weekColumn}
            </AppText>
            <AppText variant="small">{fr.screens.stats.countColumn}</AppText>
          </View>
          {weeks.map((week) => (
            <View key={week.week_start} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
              <AppText style={styles.flex}>{formatDate(week.week_start)}</AppText>
              <AppText>{week.count}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** A clean, even top value (2, 4, 6, 8, 10, 20…) so that the middle gridline is a whole count. */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const step = [2, 4, 6, 8, 10].find((s) => s * magnitude >= value) ?? 10;
  return Math.max(2, step * magnitude);
}

const AXIS_WIDTH = 28;

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  plot: { flexDirection: 'row', height: CHART_HEIGHT },
  axis: { width: AXIS_WIDTH, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: spacing.xs },
  area: { flex: 1, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  columns: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 },
  bar: {
    width: '70%',
    maxWidth: MAX_BAR_WIDTH,
    // Rounded data end, square at the baseline.
    borderTopLeftRadius: BAR_RADIUS,
    borderTopRightRadius: BAR_RADIUS,
  },
  capLabel: { marginBottom: 2 },
  xAxis: { flexDirection: 'row', marginLeft: AXIS_WIDTH, gap: 2 },
  xLabel: { flex: 1, textAlign: 'center', fontSize: 11, minWidth: 0 },
  toggle: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
});
