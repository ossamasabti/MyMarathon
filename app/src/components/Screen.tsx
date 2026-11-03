import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Halos } from './Decor';
import { TitleBar } from './TitleBar';

interface ScreenProps {
  title?: string;
  children: ReactNode;
  /** Wrap content in a ScrollView (default: true). */
  scroll?: boolean;
  /** Use the full available width (week grid, timeline). */
  fullWidth?: boolean;
}

export function Screen({ title, children, scroll = true, fullWidth = false }: ScreenProps) {
  const theme = useTheme();
  const content = (
    <View style={[styles.content, fullWidth && styles.fullWidth]}>
      {title ? (
        <View style={styles.title}>
          <AppText variant="title">{title}</AppText>
          <TitleBar />
        </View>
      ) : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: theme.background }]}>
      <Halos />
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  title: { marginBottom: spacing.xs },
  scroll: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  fullWidth: { maxWidth: undefined },
});
