import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { MIN_TOUCH, radius, spacing } from '@/theme/colors';
import { useIsWide, useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { MOBILE_ITEMS, SECONDARY_ITEMS, WIDE_ITEMS, type NavItem } from './navigation';

/** Sidebar on large screens, bottom tab bar on phones. */
export function AppTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const theme = useTheme();
  const wide = useIsWide();
  const currentName = state.routes[state.index]?.name;

  const items = wide ? WIDE_ITEMS : MOBILE_ITEMS;
  const isActive = (item: NavItem) =>
    item.name === currentName ||
    // On mobile, "Plus" stays highlighted while one of its screens is open.
    (!wide && item.name === 'more' && SECONDARY_ITEMS.some((s) => s.name === currentName));

  const renderItem = (item: NavItem) => {
    const active = isActive(item);
    const color = active ? theme.primary : theme.textMuted;
    return (
      <Pressable
        key={item.name}
        accessibilityRole="tab"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: active }}
        onPress={() => {
          const route = state.routes.find((r) => r.name === item.name);
          if (route) navigateToTab(route.key);
        }}
        style={({ pressed }) => [
          wide ? styles.sideItem : styles.bottomItem,
          active && wide && { backgroundColor: theme.primarySoft },
          pressed && { opacity: 0.7 },
        ]}>
        <Ionicons name={item.icon} size={22} color={color} />
        <AppText
          variant={wide ? 'body' : 'small'}
          color={active ? theme.primary : theme.textMuted}
          style={!wide && styles.bottomLabel}
          numberOfLines={1}>
          {item.label}
        </AppText>
      </Pressable>
    );
  };

  if (wide) {
    return (
      <View
        accessibilityRole="tablist"
        style={[
          styles.sidebar,
          { backgroundColor: theme.surface, borderRightColor: theme.border, paddingTop: insets.top + spacing.lg },
        ]}>
        <AppText variant="heading" style={styles.brand}>
          {fr.appName}
        </AppText>
        {items.map(renderItem)}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bottomBar,
        { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom },
      ]}>
      {items.map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  brand: { paddingHorizontal: spacing.sm, marginBottom: spacing.md },
  sideItem: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomItem: {
    flex: 1,
    minHeight: MIN_TOUCH + 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  bottomLabel: { fontSize: 12, lineHeight: 16 },
});
