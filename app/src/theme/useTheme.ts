import { useColorScheme, useWindowDimensions } from 'react-native';

import { usePrefsStore } from '@/stores/prefsStore';

import { palette, WIDE_BREAKPOINT, type ColorScheme, type ThemeColors } from './colors';

/** The scheme in use: the user's choice in Réglages, or the system's. */
export function useColorSchemeName(): ColorScheme {
  const system = useColorScheme();
  const preference = usePrefsStore((s) => s.theme);
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): ThemeColors {
  return palette[useColorSchemeName()];
}

/** True on large screens (PC browser, tablets in landscape). */
export function useIsWide(): boolean {
  return useWindowDimensions().width >= WIDE_BREAKPOINT;
}
