import * as SecureStore from 'expo-secure-store';

// Native (Android / iOS): refresh token in the OS keychain / keystore.
// The web counterpart lives in tokenStorage.web.ts (resolved by Metro).
const REFRESH_KEY = 'mymarathon.refresh';

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
