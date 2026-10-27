// Web: SecureStore is unavailable, so the refresh token goes to localStorage.
// The short-lived access token is only ever kept in memory (auth store).
const REFRESH_KEY = 'mymarathon.refresh';

function storage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export async function getRefreshToken(): Promise<string | null> {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

export async function setRefreshToken(token: string): Promise<void> {
  storage()?.setItem(REFRESH_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  storage()?.removeItem(REFRESH_KEY);
}
