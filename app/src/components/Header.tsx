import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { MIN_TOUCH, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface HeaderProps {
  title: string;
  /** Where "back" goes when there is no history (e.g. after a page reload on the web). */
  fallbackHref?: '/' | '/goals' | '/references';
  right?: ReactNode;
}

export function Header({ title, fallbackHref = '/', right }: HeaderProps) {
  const theme = useTheme();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(fallbackHref));
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fr.common.back}
        onPress={goBack}
        hitSlop={4}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}>
        <Ionicons name="chevron-back" size={24} color={theme.primary} />
      </Pressable>
      <AppText variant="title" style={styles.title} numberOfLines={2}>
        {title}
      </AppText>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  title: { flex: 1 },
  right: { flexDirection: 'row', gap: spacing.sm },
});
