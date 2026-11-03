import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { elevation, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface SectionProps {
  title?: string;
  /** Icon shown in a soft colored badge before the title. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  right?: ReactNode;
  children: ReactNode;
}

/** A card grouping related content under a heading. */
export function Section({ title, icon, right, children }: SectionProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, elevation(theme.shadow)]}>
      {title || right ? (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {icon ? (
              <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name={icon} size={18} color={theme.primary} />
              </View>
            ) : null}
            {title ? (
              <AppText variant="heading" style={styles.title}>
                {title}
              </AppText>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md + 4, gap: spacing.sm, borderRadius: radius.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  title: { flexShrink: 1 },
});
