import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...props }: AppTextProps) {
  const theme = useTheme();
  const defaultColor = variant === 'muted' || variant === 'small' ? theme.textMuted : theme.text;
  return (
    <Text
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      style={[styles[variant], { color: color ?? defaultColor }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 22 },
  muted: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
});
