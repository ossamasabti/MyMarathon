import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SECONDARY_ITEMS } from '@/components/navigation';
import { elevation, MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useTheme } from '@/theme/useTheme';
import { fr } from '@/i18n/fr';

/** Mobile-only menu listing the screens that do not fit in the bottom tabs. */
export default function MoreScreen() {
  const theme = useTheme();
  return (
    <Screen title={fr.nav.more}>
      <View style={[styles.list, { backgroundColor: theme.surface }, elevation(theme.shadow)]}>
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
            <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={item.icon} size={20} color={theme.primary} />
            </View>
            <AppText style={styles.label}>{item.label}</AppText>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: radius.lg },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontWeight: '600' },
  row: {
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
