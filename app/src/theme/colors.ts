/**
 * Design tokens. Text/background pairs meet WCAG AA (≥ 4.5:1) in both schemes.
 */
export const palette = {
  light: {
    background: '#F3FBF9',
    surface: '#FFFFFF',
    surfaceAlt: '#E4F4F0',
    border: '#CFE3DE',
    text: '#10231F',
    textMuted: '#4A5F5A',
    primary: '#0D766C',
    onPrimary: '#FFFFFF',
    primarySoft: '#DDF3EF',
    danger: '#B42318',
    success: '#1E7A3E',
    /** Amber highlight (streaks, trophies): a fill, text on it uses onAccent. */
    accent: '#F2A516',
    onAccent: '#2B1D00',
    /** Amber readable as text on surfaces. */
    accentText: '#8A5A00',
    /** Gradient stops of hero cards and primary buttons (white text ≥ 5:1 on both). */
    gradientStart: '#0D766C',
    gradientEnd: '#15803D',
    onGradient: '#FFFFFF',
    /** Translucent layers on the gradient: white = progress track, dark = pills (white text stays ≥ 6:1). */
    onGradientSoft: 'rgba(255, 255, 255, 0.25)',
    onGradientShade: 'rgba(0, 0, 0, 0.18)',
    shadow: '#0D3B35',
  },
  dark: {
    background: '#0B1715',
    surface: '#13221F',
    surfaceAlt: '#1C2F2B',
    border: '#2A403B',
    text: '#E8F5F2',
    textMuted: '#9DB5AF',
    primary: '#5FD4C4',
    onPrimary: '#05201C',
    primarySoft: '#173B36',
    danger: '#F49B92',
    success: '#7DD39A',
    accent: '#F5B53A',
    onAccent: '#2B1D00',
    accentText: '#F5B53A',
    gradientStart: '#0E7C71',
    gradientEnd: '#15803D',
    onGradient: '#FFFFFF',
    onGradientSoft: 'rgba(255, 255, 255, 0.25)',
    onGradientShade: 'rgba(0, 0, 0, 0.22)',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Soft card shadow (replaces grey borders). */
export function elevation(shadowColor: string, level: 1 | 2 = 1) {
  return {
    shadowColor,
    shadowOpacity: level === 1 ? 0.08 : 0.16,
    shadowRadius: level === 1 ? 12 : 20,
    shadowOffset: { width: 0, height: level === 1 ? 4 : 8 },
    elevation: level === 1 ? 2 : 6,
  };
}

/** Minimum touch target size (accessibility). */
export const MIN_TOUCH = 44;

/** Width from which the sidebar layout replaces bottom tabs. */
export const WIDE_BREAKPOINT = 768;

export const MAX_CONTENT_WIDTH = 960;

/** Single-series column charts: past periods = lighter step, current period = accent (same teal ramp). */
export const chartColors = {
  light: { past: '#5CC2B3', current: '#0E8A7E', grid: '#E1EEEB' },
  dark: { past: '#1D5E56', current: '#3FB8A8', grid: '#243632' },
} as const;

/**
 * Focus calendar: one teal ramp, from "a little" to "daily goal reached" (validated with the
 * dataviz palette script against the light and dark surfaces). Empty days use surfaceAlt.
 */
export const heatmapColors = {
  light: ['#9EDDD3', '#4FB9AA', '#16877A', '#0B5149'],
  dark: ['#16514A', '#1F8A7D', '#45BFAF', '#9FE6DB'],
} as const;
