import { useColorScheme, useWindowDimensions } from 'react-native';

import { palette, WIDE_BREAKPOINT, type ColorScheme, type ThemeColors } from './colors';

export function useColorSchemeName(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useTheme(): ThemeColors {
  return palette[useColorSchemeName()];
}

/** True on large screens (PC browser, tablets in landscape). */
export function useIsWide(): boolean {
  return useWindowDimensions().width >= WIDE_BREAKPOINT;
}
