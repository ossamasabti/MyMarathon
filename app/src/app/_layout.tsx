import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/authStore';
import { palette } from '@/theme/colors';
import { useColorSchemeName } from '@/theme/useTheme';

SplashScreen.preventAutoHideAsync();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const scheme = useColorSchemeName();
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Auth guard: keep signed-out users in (auth) and signed-in users out of it.
  const segments = useSegments();
  const inAuthGroup = segments[0] === '(auth)';
  useEffect(() => {
    if (status === 'loading') return;
    SplashScreen.hideAsync();
    if (status === 'signedOut' && !inAuthGroup) router.replace('/login');
    else if (status === 'signedIn' && inAuthGroup) router.replace('/');
  }, [status, inAuthGroup]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = palette[scheme];
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
