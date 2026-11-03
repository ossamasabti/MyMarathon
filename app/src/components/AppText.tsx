import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFor } from '@/theme/fonts';
import { useTheme } from '@/theme/useTheme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'muted' | 'small';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...props }: AppTextProps) {
  const theme = useTheme();
  const defaultColor = variant === 'muted' || variant === 'small' ? theme.textMuted : theme.text;
  const flat: TextStyle = StyleSheet.flatten([styles[variant], style]) ?? {};
  return (
    <Text
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      style={[flat, { color: color ?? flat.color ?? defaultColor }, fontFor(flat.fontWeight)]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 40, fontWeight: '800', lineHeight: 46, letterSpacing: -0.5 },
  title: { fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5 },
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 22 },
  muted: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
});
