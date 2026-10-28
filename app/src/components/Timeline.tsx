import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Domain, Goal, Horizon } from '@/api/types';
import { fr } from '@/i18n/fr';
import { barGeometry, monthTicks, todayPct, yearBounds } from '@/lib/calendar';
import { formatRange } from '@/lib/dates';
import { HORIZONS } from '@/lib/horizons';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useIsWide, useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { DomainDot } from './Badge';

const ROW_HEIGHT = MIN_TOUCH + 4;
const BAR_HEIGHT = 24;
const HEADER_HEIGHT = 28;
/** Below this width the track scrolls horizontally (phones). */
const MIN_TRACK_WIDTH = 720;

interface TimelineProps {
  year: number;
  goals: Goal[];
  domains: Domain[];
}

type Row = { kind: 'group'; horizon: Horizon } | { kind: 'goal'; goal: Goal };

/** Year timeline: one row per goal, grouped by horizon, colored by domain. */
export function Timeline({ year, goals, domains }: TimelineProps) {
  const theme = useTheme();
  const wide = useIsWide();
  const domainById = new Map(domains.map((d) => [d.id, d]));
  const [yearStart, yearEnd] = yearBounds(year);
  const today = todayPct(year);
  const labelWidth = wide ? 220 : 130;
  const [available, setAvailable] = useState(0);

  const rows: Row[] = [];
  for (const horizon of HORIZONS) {
    const group = goals
      .filter((g) => g.horizon === horizon)
      .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id);
    if (group.length) {
      rows.push({ kind: 'group', horizon });
      group.forEach((goal) => rows.push({ kind: 'goal', goal }));
    }
  }

  const labels = (
    <View style={{ width: labelWidth }}>
      <View style={{ height: HEADER_HEIGHT }} />
      {rows.map((row) =>
        row.kind === 'group' ? (
          <View key={`g-${row.horizon}`} style={styles.groupRow}>
            <AppText variant="small" color={theme.textMuted} style={styles.groupLabel}>
              {fr.horizon[row.horizon]}
            </AppText>
          </View>
        ) : (
          <Pressable
            key={row.goal.id}
            accessibilityRole="link"
            onPress={() => openGoal(row.goal.id)}
            style={({ pressed }) => [styles.labelRow, pressed && { opacity: 0.7 }]}>
            {row.goal.domain && domainById.get(row.goal.domain) ? (
              <DomainDot color={domainById.get(row.goal.domain)?.color ?? theme.primary} size={8} />
            ) : null}
            <AppText variant="small" color={theme.text} numberOfLines={2} style={styles.flex}>
              {row.goal.title}
            </AppText>
          </Pressable>
        ),
      )}
    </View>
  );

  const track = (
    <View style={styles.track}>
      {/* Month grid and labels */}
      <View style={[StyleSheet.absoluteFill, styles.months]} pointerEvents="none">
        {monthTicks(year).map((tick, index) => (
          <View
            key={tick.label + index}
            style={[
              styles.month,
              { left: `${tick.leftPct}%`, width: `${tick.widthPct}%`, borderLeftColor: theme.border },
              index % 2 === 1 && { backgroundColor: theme.surfaceAlt },
            ]}>
            <AppText variant="small" style={styles.monthLabel}>
              {tick.label}
            </AppText>
          </View>
        ))}
      </View>

      <View style={{ height: HEADER_HEIGHT }} />
      {rows.map((row) =>
        row.kind === 'group' ? (
          <View key={`g-${row.horizon}`} style={styles.groupRow} />
        ) : (
          <GoalBar
            key={row.goal.id}
            goal={row.goal}
            color={(row.goal.domain && domainById.get(row.goal.domain)?.color) || theme.primary}
            yearStart={yearStart}
            yearEnd={yearEnd}
          />
        ),
      )}

      {today !== null ? (
        <View
          pointerEvents="none"
          accessibilityLabel={fr.screens.timeline.today}
          style={[styles.today, { left: `${today}%`, backgroundColor: theme.danger }]}
        />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {labels}
      {/* The track fills the remaining width, and scrolls horizontally when that is below MIN_TRACK_WIDTH. */}
      <View style={styles.flex} onLayout={(e) => setAvailable(e.nativeEvent.layout.width)}>
        <ScrollView horizontal>
          <View style={{ width: Math.max(MIN_TRACK_WIDTH, available) }}>{track}</View>
        </ScrollView>
      </View>
    </View>
  );
}

function openGoal(id: number) {
  router.push({ pathname: '/goals/[id]', params: { id: String(id) } });
}

interface GoalBarProps {
  goal: Goal;
  color: string;
  yearStart: string;
  yearEnd: string;
}

function GoalBar({ goal, color: storedColor, yearStart, yearEnd }: GoalBarProps) {
  const theme = useTheme();
  const color = useDomainColor()(storedColor);
  const geometry = barGeometry(goal.start_date, goal.end_date, yearStart, yearEnd);
  const percent = Math.round(goal.progress * 100);
  const achieved = goal.status === 'achieved';
  const dimmed = goal.status === 'paused' || goal.status === 'abandoned';
  const label = fr.screens.timeline.barLabel(
    goal.title,
    fr.horizon[goal.horizon],
    formatRange(goal.start_date, goal.end_date),
    percent,
    goal.is_late,
  );

  return (
    <View style={styles.barRow}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() => openGoal(goal.id)}
        style={({ pressed }) => [
          styles.bar,
          {
            left: `${geometry.leftPct}%`,
            width: `${geometry.widthPct}%`,
            // Light tint of the domain color = remaining distance; solid = distance covered.
            backgroundColor: `${color}33`,
            borderColor: goal.is_late ? theme.danger : color,
            borderStyle: goal.is_late ? 'dashed' : 'solid',
            borderTopLeftRadius: geometry.clippedStart ? 0 : radius.sm,
            borderBottomLeftRadius: geometry.clippedStart ? 0 : radius.sm,
            borderTopRightRadius: geometry.clippedEnd ? 0 : radius.sm,
            borderBottomRightRadius: geometry.clippedEnd ? 0 : radius.sm,
            opacity: dimmed ? 0.5 : pressed ? 0.75 : 1,
          },
        ]}>
        <View style={[styles.fill, { width: `${achieved ? 100 : percent}%`, backgroundColor: color }]} />
        <View style={styles.barContent}>
          {geometry.clippedStart ? <Ionicons name="chevron-back" size={14} color={theme.text} /> : <View />}
          {achieved ? <AppText variant="small">{'\u{1F3C1}'}</AppText> : null}
          {geometry.clippedEnd ? <Ionicons name="chevron-forward" size={14} color={theme.text} /> : <View />}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  flex: { flex: 1 },
  track: { flex: 1, position: 'relative' },
  months: { flexDirection: 'row' },
  month: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: StyleSheet.hairlineWidth },
  monthLabel: { paddingLeft: spacing.xs, lineHeight: HEADER_HEIGHT },
  groupRow: { height: HEADER_HEIGHT, justifyContent: 'flex-end', paddingHorizontal: spacing.sm },
  groupLabel: { fontWeight: '600', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
  labelRow: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  barRow: { height: ROW_HEIGHT, justifyContent: 'center' },
  bar: {
    position: 'absolute',
    height: BAR_HEIGHT,
    top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
    borderWidth: 1.5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barContent: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  today: { position: 'absolute', top: 0, bottom: 0, width: 2 },
});
