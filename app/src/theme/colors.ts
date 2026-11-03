/**
 * Design tokens. Text/background pairs meet WCAG AA (≥ 4.5:1) in both schemes.
 */
export const palette = {
  light: {
    background: '#F4F8FC',
    surface: '#FFFFFF',
    surfaceAlt: '#E8F1FA',
    border: '#DCE7F2',
    /** Navy ink (titles and body). */
    text: '#001540',
    textMuted: '#5A6480',
    primary: '#1570A8',
    onPrimary: '#FFFFFF',
    primarySoft: '#E3F0FA',
    danger: '#B42318',
    success: '#1E7A3E',
    /** Yellow highlight (streaks, trophies, "à venir" badges): a fill, text on it uses onAccent. */
    accent: '#FFD60A',
    onAccent: '#001540',
    /** Readable accent-ish text on surfaces. */
    accentText: '#8A5A00',
    /** Primary buttons and progress: deep blue -> logo blue (white label ≥ 4.8:1 where it sits). */
    gradientStart: '#0F5E9C',
    gradientEnd: '#1B89C6',
    onGradient: '#FFFFFF',
    /** Navy hero band (Today card, quotes): white text, sky-blue highlights. */
    heroStart: '#001540',
    heroEnd: '#0A1F5C',
    onHero: '#FFFFFF',
    onHeroMuted: '#C9D6F0',
    heroHighlight: '#4FC3F7',
    /** Translucent layers on the hero: white = progress track, dark = pills. */
    onGradientSoft: 'rgba(255, 255, 255, 0.16)',
    onGradientShade: 'rgba(255, 255, 255, 0.1)',
    /** Soft blue halos behind screens (decoration only). */
    halo: 'rgba(79, 195, 247, 0.35)',
    haloAlt: 'rgba(27, 137, 198, 0.22)',
    shadow: '#0F1A33',
  },
  dark: {
    background: '#071233',
    surface: '#0E1C45',
    surfaceAlt: '#162757',
    border: '#22346A',
    text: '#EAF2FB',
    textMuted: '#A9B6D3',
    primary: '#4FC3F7',
    onPrimary: '#001540',
    primarySoft: '#13305E',
    danger: '#F49B92',
    success: '#7DD39A',
    accent: '#FFD60A',
    onAccent: '#001540',
    accentText: '#FFD60A',
    gradientStart: '#0F5E9C',
    gradientEnd: '#1B89C6',
    onGradient: '#FFFFFF',
    heroStart: '#0A1F5C',
    heroEnd: '#13307A',
    onHero: '#FFFFFF',
    onHeroMuted: '#C9D6F0',
    heroHighlight: '#4FC3F7',
    onGradientSoft: 'rgba(255, 255, 255, 0.16)',
    onGradientShade: 'rgba(255, 255, 255, 0.1)',
    halo: 'rgba(79, 195, 247, 0.2)',
    haloAlt: 'rgba(27, 137, 198, 0.22)',
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
  md: 12,
  lg: 18,
  pill: 999,
} as const;

/** Soft card shadow (replaces grey borders). */
export function elevation(shadowColor: string, level: 1 | 2 = 1) {
  return {
    shadowColor,
    shadowOpacity: level === 1 ? 0.08 : 0.18,
    shadowRadius: level === 1 ? 30 : 40,
    shadowOffset: { width: 0, height: level === 1 ? 10 : 16 },
    elevation: level === 1 ? 2 : 6,
  };
}

/** Minimum touch target size (accessibility). */
export const MIN_TOUCH = 44;

/** Width from which the sidebar layout replaces bottom tabs. */
export const WIDE_BREAKPOINT = 768;

export const MAX_CONTENT_WIDTH = 960;

/** Single-series column charts: past periods = lighter step, current period = accent (same blue ramp). */
export const chartColors = {
  light: { past: '#86B6EF', current: '#2A78D6', grid: '#E4E8EE' },
  dark: { past: '#1C5CAB', current: '#3987E5', grid: '#22346A' },
} as const;

/**
 * Focus calendar: one blue ramp, from "a little" to "daily goal reached" (validated with the
 * dataviz palette script against the light and dark surfaces). Empty days use surfaceAlt.
 */
export const heatmapColors = {
  light: ['#86B6EF', '#5598E7', '#256ABF', '#104281'],
  dark: ['#184F95', '#2A78D6', '#5598E7', '#9EC5F4'],
} as const;
