import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import type { TextStyle } from 'react-native';

/** Loaded once by the root layout (only these five weights are bundled). */
export const FONT_ASSETS = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

const FAMILY_BY_WEIGHT: Record<string, keyof typeof FONT_ASSETS> = {
  normal: 'PlusJakartaSans_400Regular',
  '100': 'PlusJakartaSans_400Regular',
  '200': 'PlusJakartaSans_400Regular',
  '300': 'PlusJakartaSans_400Regular',
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  '700': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
  '900': 'PlusJakartaSans_800ExtraBold',
};

/**
 * Each weight is its own font file: a custom family ignores fontWeight on Android,
 * so the weight picks the family and is then dropped.
 */
export function fontFor(weight: TextStyle['fontWeight'] = 'normal'): TextStyle {
  return { fontFamily: FAMILY_BY_WEIGHT[String(weight)] ?? 'PlusJakartaSans_400Regular', fontWeight: 'normal' };
}
