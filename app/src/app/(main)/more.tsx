import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SECONDARY_ITEMS } from '@/components/navigation';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';
import { fr } from '@/i18n/fr';

/** Mobile-only menu listing the screens that do not fit in the bottom tabs. */
export default function MoreScreen() {
  const theme = useTheme();
  return (
    <Screen title={fr.nav.more}>
      <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {SECONDARY_ITEMS.map((item, index) => (
          <Pressable
            key={item.name}
            accessibilityRole="link"
            onPress={() => router.navigate(item.href)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}>
            <AppText>{item.label}</AppText>
            <AppText variant="muted">›</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
