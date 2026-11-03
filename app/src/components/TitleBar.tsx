import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme/useTheme';

/** Short gradient underline under page titles. */
export function TitleBar({ width = 56 }: { width?: number }) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.gradientEnd, theme.heroHighlight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.bar, { width }]}
    />
  );
}

const styles = StyleSheet.create({
  bar: { height: 4, borderRadius: 2, marginTop: 6 },
});
