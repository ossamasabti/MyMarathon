import { StyleSheet, View } from 'react-native';

import type { Horizon } from '@/api/types';
import { fr } from '@/i18n/fr';
import { radius, spacing } from '@/theme/colors';
import { useDomainColor } from '@/theme/domainColors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export function Badge({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { borderColor: color ?? theme.primarySoft, backgroundColor: theme.primarySoft }]}>
      <AppText variant="small" color={theme.text} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

export function HorizonBadge({ horizon }: { horizon: Horizon }) {
  return <Badge label={fr.horizon[horizon]} />;
}

/** A small colored dot identifying a domain. */
export function DomainDot({ color, size = 10 }: { color: string; size?: number }) {
  const display = useDomainColor();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: display(color) }} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
