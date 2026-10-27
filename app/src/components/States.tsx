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

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <View style={styles.center}>
      <AppText variant="muted" style={styles.text}>
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  text: { textAlign: 'center' },
});
