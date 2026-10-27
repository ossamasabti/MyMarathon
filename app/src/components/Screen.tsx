import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface ScreenProps {
  title?: string;
  children: ReactNode;
  /** Wrap content in a ScrollView (default: true). */
  scroll?: boolean;
}

export function Screen({ title, children, scroll = true }: ScreenProps) {
  const theme = useTheme();
  const content = (
    <View style={styles.content}>
      {title ? <AppText variant="title">{title}</AppText> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: theme.background }]}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
});
