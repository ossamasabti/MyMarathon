import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState({ label = fr.common.loading }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityLabel={label}>
      <ActivityIndicator color={theme.primary} size="large" />
      <AppText variant="muted">{label}</AppText>
    </View>
  );
}

interface EmptyStateProps {
  message: string;
  hint?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function EmptyState({ message, hint, icon = 'sparkles-outline' }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={30} color={theme.primary} />
      </View>
      <AppText style={[styles.text, styles.message]}>
        {message}
      </AppText>
      {hint ? (
        <AppText variant="small" style={styles.text}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="alert">
      <AppText color={theme.danger} style={styles.text}>
        {message}
      </AppText>
      {onRetry ? <Button label={fr.common.retry} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  text: { textAlign: 'center', maxWidth: 420 },
  message: { fontWeight: '700' },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
