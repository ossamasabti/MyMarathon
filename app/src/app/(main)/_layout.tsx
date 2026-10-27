import { Tabs } from 'expo-router/js-tabs';

import { AppTabBar } from '@/components/AppTabBar';
import { useAuthStore } from '@/stores/authStore';
import { useIsWide, useTheme } from '@/theme/useTheme';

export default function MainLayout() {
  const wide = useIsWide();
  const theme = useTheme();
  const status = useAuthStore((s) => s.status);
  // The root layout redirects; render nothing until the status matches this group.
  if (status !== 'signedIn') return null;
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="week" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="review" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="more" />
      <Tabs.Screen name="domains/[id]" />
    </Tabs>
  );
}
