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
    secondary: 'transparent',
    ghost: 'transparent',
    danger: theme.danger,
  }[variant];
  const foreground =
    variant === 'primary' ? theme.onGradient : variant === 'danger' ? theme.onPrimary : variant === 'secondary' ? theme.text : theme.primary;

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
        variant === 'secondary' && [styles.outline, { borderColor: theme.text }],
        variant === 'primary' && !inactive && {
          shadowColor: theme.gradientEnd,
          shadowOpacity: 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        {
          backgroundColor: background,
          opacity: inactive ? 0.55 : 1,
          transform: [{ translateY: pressed && !inactive ? 1 : 0 }],
        },
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fill]}
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
  },
  ghost: { paddingHorizontal: spacing.sm },
  outline: { borderWidth: 2 },
  // Rounded here, not with overflow: hidden, so the button keeps its shadow.
  fill: { borderRadius: radius.pill },
  label: { fontSize: 16, textAlign: 'center' },
});
