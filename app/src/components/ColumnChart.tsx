import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { chartColors, MIN_TOUCH, spacing } from '@/theme/colors';
import { useColorSchemeName, useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

const CHART_HEIGHT = 160;
const MAX_BAR_WIDTH = 24;
const BAR_RADIUS = 4;

export interface ColumnBar {
  key: string;
  value: number;
  /** Text under the column (may be empty to avoid collisions). */
  axisLabel: string;
  /** Readout / accessibility label, e.g. "Semaine du 03/03 : 4 tâches". */
  description: string;
  /** First column of the table view. */
  tableLabel: string;
}

interface ColumnChartProps {
  bars: ColumnBar[];
  /** Column drawn in the accent step (current period, best hour…); the others use the lighter step. */
  accentIndex: number | null;
  /** Columns carrying a value label above them (keep it to one or two). */
  labelledIndexes: number[];
  /** Column read out when nothing is hovered or pressed. */
  defaultIndex: number;
  formatValue: (value: number) => string;
  summary: string;
  tableHeaders: [string, string];
}

/**
 * Single-series column chart (one blue ramp): one accent column, the rest in a lighter step.
 * Any column can be pressed/hovered to read its value, and a table view lists everything.
 */
export function ColumnChart({
  bars,
  accentIndex,
  labelledIndexes,
  defaultIndex,
  formatValue,
  summary,
  tableHeaders,
}: ColumnChartProps) {
  const theme = useTheme();
  const colors = chartColors[useColorSchemeName()];
  const [selected, setSelected] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(...bars.map((b) => b.value), 0);
  const top = niceCeil(Math.max(max, 1));
  const readout = bars[selected ?? defaultIndex];

  return (
    <View style={styles.container}>
      {/* Readout of the pressed/hovered column (tooltip equivalent, also works on touch). */}
      <AppText variant="small" color={theme.text} accessibilityLiveRegion="polite">
        {readout?.description ?? ''}
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
            {bars.map((bar, index) => {
              const height = (bar.value / top) * CHART_HEIGHT;
              const active = index === selected;
              return (
                <Pressable
                  key={bar.key}
                  accessibilityRole="button"
                  accessibilityLabel={bar.description}
                  onPress={() => setSelected(active ? null : index)}
                  onHoverIn={() => setSelected(index)}
                  onHoverOut={() => setSelected(null)}
                  style={styles.slot}>
                  {labelledIndexes.includes(index) && bar.value > 0 ? (
                    <AppText variant="small" color={theme.text} style={styles.capLabel} numberOfLines={1}>
                      {formatValue(bar.value)}
                    </AppText>
                  ) : null}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, bar.value > 0 ? 2 : 0),
                        backgroundColor: index === accentIndex ? colors.current : colors.past,
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
        {bars.map((bar) => (
          <AppText key={bar.key} variant="small" style={styles.xLabel} numberOfLines={1}>
            {bar.axisLabel}
          </AppText>
        ))}
      </View>

      <AppText variant="small">{summary}</AppText>

      <Pressable accessibilityRole="button" onPress={() => setShowTable((v) => !v)} style={styles.toggle}>
        <AppText variant="small" color={theme.primary}>
          {showTable ? fr.screens.stats.hideTable : fr.screens.stats.showTable}
        </AppText>
      </Pressable>
      {showTable ? (
        <View accessibilityRole="list">
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <AppText variant="small" style={styles.flex}>
              {tableHeaders[0]}
            </AppText>
            <AppText variant="small">{tableHeaders[1]}</AppText>
          </View>
          {bars.map((bar) => (
            <View key={bar.key} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
              <AppText style={styles.flex}>{bar.tableLabel}</AppText>
              <AppText>{formatValue(bar.value)}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** A clean, even top value (2, 4, 6, 8, 10, 20…) so that the middle gridline is a whole number. */
function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const step = [2, 4, 6, 8, 10].find((s) => s * magnitude >= value) ?? 10;
  return Math.max(2, step * magnitude);
}

const AXIS_WIDTH = 32;

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
