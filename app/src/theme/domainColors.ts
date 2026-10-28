import type { ColorScheme } from './colors';
import { useColorSchemeName } from './useTheme';

/**
 * Domain colors = a validated categorical palette (CVD-safe in both modes, checked with the
 * dataviz validator). The light hex is what the API stores; the dark step is derived at render time.
 * Order matters: adjacent slots are the most distinguishable, so new domains take them in order.
 */
export const DOMAIN_PALETTE = [
  { light: '#2A78D6', dark: '#3987E5' }, // blue
  { light: '#EB6834', dark: '#D95926' }, // orange
  { light: '#1BAF7A', dark: '#199E70' }, // aqua
  { light: '#EDA100', dark: '#C98500' }, // yellow
  { light: '#E87BA4', dark: '#D55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#6250D6', dark: '#9085E9' }, // violet
  { light: '#E34948', dark: '#E66767' }, // red
] as const;

const DARK_BY_LIGHT = new Map<string, string>(DOMAIN_PALETTE.map((c) => [c.light, c.dark]));

/** Display color of a stored domain color in the current scheme (unknown colors pass through). */
export function domainColor(hex: string, scheme: ColorScheme): string {
  const key = hex.toUpperCase();
  return scheme === 'dark' ? (DARK_BY_LIGHT.get(key) ?? hex) : hex;
}

export function useDomainColor(): (hex: string) => string {
  const scheme = useColorSchemeName();
  return (hex) => domainColor(hex, scheme);
}
