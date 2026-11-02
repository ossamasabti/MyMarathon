import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Expo config. Dynamic only for one thing: an APK pointed at a development backend over plain
 * HTTP on the local network needs cleartext traffic, which Android blocks by default. It is
 * allowed only when the API URL of the build is http://, never for the hosted HTTPS API.
 */
const allowCleartext = (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http://');

/**
 * The preview APK is installed directly on phones: native code only for 64-bit ARM (every
 * Android phone since ~2017) instead of 4 processor types, about 3x smaller. The Play Store
 * bundle (production) keeps them all: the store already sends each phone only its own.
 */
const apkArchs = process.env.EAS_BUILD_PROFILE === 'preview' ? { buildArchs: ['arm64-v8a'] } : {};

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
    bundleIdentifier: 'com.mymarathon.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#1F5FD1',
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
        backgroundColor: '#1F5FD1',
        image: './assets/images/splash-icon.png',
        imageWidth: 140,
      },
    ],
    'expo-secure-store',
    'expo-notifications',
    ['expo-build-properties', { android: { usesCleartextTraffic: allowCleartext, ...apkArchs } }],
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