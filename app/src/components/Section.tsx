import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface SectionProps {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
}

/** A card grouping related content under a heading. */
export function Section({ title, right, children }: SectionProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {title || right ? (
        <View style={styles.header}>
          {title ? <AppText variant="heading">{title}</AppText> : <View />}
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
