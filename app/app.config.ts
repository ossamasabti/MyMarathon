import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo config. Dynamic only for one thing: an APK pointed at a development backend over plain
 * HTTP on the local network needs cleartext traffic, which Android blocks by default. It is
 * allowed only when the API URL of the build is http://, never for the hosted HTTPS API.
 */
const allowCleartext = (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http://');

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
  extra: {
    eas: {
      projectId: 'bb9c9bfd-38f3-4d91-bd6f-d8766dd41901',
    },
  },
});