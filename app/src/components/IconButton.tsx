import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { MIN_TOUCH, radius } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Accessible label (the button has no visible text). */
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

export function IconButton({ icon, label, onPress, color, disabled = false }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={22} color={color ?? theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
