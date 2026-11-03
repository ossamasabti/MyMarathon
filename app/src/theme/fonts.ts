import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Poppins_800ExtraBold } from '@expo-google-fonts/poppins/800ExtraBold';
import type { TextStyle } from 'react-native';

/** Loaded once by the root layout (only these five weights are bundled). */
export const FONT_ASSETS = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
};

const FAMILY_BY_WEIGHT: Record<string, keyof typeof FONT_ASSETS> = {
  normal: 'Poppins_400Regular',
  '100': 'Poppins_400Regular',
  '200': 'Poppins_400Regular',
  '300': 'Poppins_400Regular',
  '400': 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  '700': 'Poppins_700Bold',
  '800': 'Poppins_800ExtraBold',
  '900': 'Poppins_800ExtraBold',
};

/**
 * Each weight is its own font file: a custom family ignores fontWeight on Android,
 * so the weight picks the family and is then dropped.
 */
export function fontFor(weight: TextStyle['fontWeight'] = 'normal'): TextStyle {
  return { fontFamily: FAMILY_BY_WEIGHT[String(weight)] ?? 'Poppins_400Regular', fontWeight: 'normal' };
}
