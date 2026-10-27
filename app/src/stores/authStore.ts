import { create } from 'zustand';

import type { TokenPair } from '@/api/types';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/lib/tokenStorage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  /** Load the persisted refresh token; the API client exchanges it on first call. */
  hydrate: () => Promise<void>;
  signIn: (tokens: TokenPair) => Promise<void>;
  setTokens: (tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    const refreshToken = await getRefreshToken().catch(() => null);
    set({ refreshToken, status: refreshToken ? 'signedIn' : 'signedOut' });
  },

  signIn: async (tokens) => {
    await setRefreshToken(tokens.refresh);
    set({ accessToken: tokens.access, refreshToken: tokens.refresh, status: 'signedIn' });
  },

  setTokens: async (tokens) => {
    await setRefreshToken(tokens.refresh);
    set({ accessToken: tokens.access, refreshToken: tokens.refresh });
  },

  signOut: async () => {
    await clearRefreshToken().catch(() => undefined);
    set({ accessToken: null, refreshToken: null, status: 'signedOut' });
  },
}));
