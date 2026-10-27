import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const background = variant === 'primary' ? theme.primary : variant === 'secondary' ? theme.surfaceAlt : 'transparent';
  const foreground = variant === 'primary' ? theme.onPrimary : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, opacity: inactive ? 0.6 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 16, fontWeight: '600' },
});
