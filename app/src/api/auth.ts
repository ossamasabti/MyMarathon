import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';

import { apiRequest } from './client';
import type { AuthResponse, TokenPair, User } from './types';

export const meQueryKey = ['me'] as const;

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  display_name: string;
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => apiRequest<User>('/api/auth/me/'),
  });
}

export function useLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: (input: Credentials) =>
      apiRequest<TokenPair>('/api/auth/token/', { method: 'POST', body: input, auth: false }),
    onSuccess: (tokens) => signIn(tokens),
  });
}

export function useRegister() {
  const signIn = useAuthStore((s) => s.signIn);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiRequest<AuthResponse>('/api/auth/register/', { method: 'POST', body: input, auth: false }),
    onSuccess: async ({ user, access, refresh }) => {
      queryClient.setQueryData(meQueryKey, user);
      await signIn({ access, refresh });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { refreshToken } = useAuthStore.getState();
      // Best effort: the session is closed locally even if the server is unreachable.
      if (refreshToken) {
        await apiRequest('/api/auth/logout/', { method: 'POST', body: { refresh: refreshToken } }).catch(
          () => undefined,
        );
      }
    },
    onSettled: async () => {
      await useAuthStore.getState().signOut();
      queryClient.clear();
    },
  });
}
