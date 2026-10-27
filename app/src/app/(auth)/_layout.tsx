import { Stack } from 'expo-router';

import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  // The root layout redirects; render nothing until the status matches this group.
  if (status !== 'signedOut') return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
