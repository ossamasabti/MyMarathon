import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { fontFor } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

/** Pill button; the primary one wears the brand gradient. */
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const background = {
    primary: 'transparent',
    secondary: theme.primarySoft,
    ghost: 'transparent',
    danger: theme.danger,
  }[variant];
  const foreground =
    variant === 'primary' ? theme.onGradient : variant === 'danger' ? theme.onPrimary : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' && styles.ghost,
        {
          backgroundColor: background,
          opacity: inactive ? 0.55 : 1,
          transform: [{ scale: pressed && !inactive ? 0.97 : 1 }],
        },
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text style={[styles.label, { color: foreground }, fontFor('700')]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ghost: { paddingHorizontal: spacing.sm },
  label: { fontSize: 16, textAlign: 'center' },
});
