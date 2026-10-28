import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo config. Dynamic only for one thing: the `preview` EAS profile (test APK) talks to the
 * development backend over plain HTTP on the local network, which Android blocks by default.
 * Cleartext traffic is therefore allowed for that profile only, never for production builds.
 */
const allowCleartext = process.env.EAS_BUILD_PROFILE === 'preview';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'MyMarathon',
  slug: 'mymarathon',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mymarathon',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'com.mymarathon.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.mymarathon.app',
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    'expo-notifications',
    ['expo-build-properties', { android: { usesCleartextTraffic: allowCleartext } }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
