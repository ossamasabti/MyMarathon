import { Image } from 'react-native';

const logo = require('../../assets/images/logo-small.png') as number;

/** App logo (marathon medal + brain). Decorative: always shown next to the app name. */
export function AppLogo({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={logo}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
