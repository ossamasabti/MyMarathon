import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

/** A single figure with its label (no chart needed for a headline number). */
export function StatTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${value}`}
      style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppText variant="small">{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 150, padding: spacing.md, gap: spacing.xs, borderWidth: 1, borderRadius: radius.lg },
  value: { fontSize: 32, lineHeight: 38, fontWeight: '600' },
});
