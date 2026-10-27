/**
 * Design tokens. Text/background pairs meet WCAG AA (≥ 4.5:1) in both schemes.
 */
export const palette = {
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1F5',
    border: '#D5DAE1',
    text: '#14181F',
    textMuted: '#525B68',
    primary: '#1F5FD1',
    onPrimary: '#FFFFFF',
    primarySoft: '#E3ECFB',
    danger: '#B42318',
    success: '#1E7A3E',
  },
  dark: {
    background: '#0E1116',
    surface: '#171B22',
    surfaceAlt: '#212731',
    border: '#343C48',
    text: '#EEF1F5',
    textMuted: '#A5AEBB',
    primary: '#7FAAF5',
    onPrimary: '#0B1A33',
    primarySoft: '#1E2C45',
    danger: '#F49B92',
    success: '#7DD39A',
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
  sm: 6,
  md: 10,
  lg: 16,
} as const;

/** Minimum touch target size (accessibility). */
export const MIN_TOUCH = 44;

/** Width from which the sidebar layout replaces bottom tabs. */
export const WIDE_BREAKPOINT = 768;

export const MAX_CONTENT_WIDTH = 960;
