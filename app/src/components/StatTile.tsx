import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { elevation, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface StatTileProps {
  label: string;
  value: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Amber highlight (streaks, records) instead of the brand teal. */
  highlight?: boolean;
}

/** A single figure with its label (no chart needed for a headline number). */
export function StatTile({ label, value, icon, highlight = false }: StatTileProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${value}`}
      style={[styles.tile, { backgroundColor: theme.surface, borderTopColor: highlight ? theme.accent : theme.gradientEnd }, elevation(theme.shadow)]}>
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: highlight ? theme.accent : theme.primarySoft }]}>
            <Ionicons name={icon} size={16} color={highlight ? theme.onAccent : theme.primary} />
          </View>
        ) : null}
        <AppText variant="small" style={styles.label}>
          {label}
        </AppText>
      </View>
      <AppText variant="display" color={theme.primary} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 150, padding: spacing.md + 4, gap: spacing.sm, borderRadius: radius.lg, borderTopWidth: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontWeight: '600' },
  value: { fontSize: 32, lineHeight: 38 },
});
