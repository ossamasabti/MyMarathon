import { fr } from '@/i18n/fr';
import { useAuthStore } from '@/stores/authStore';

import type { ApiErrorBody, TokenPair } from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Messages for one field, e.g. `fieldErrors('email')`. */
  fieldErrors(field: string): string[] {
    const value = this.body?.[field];
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** Send the access token and refresh it on 401 (default: true). */
  auth?: boolean;
}

function firstMessage(body: ApiErrorBody | null): string {
  if (!body) return fr.common.genericError;
  const value = body.detail ?? body.non_field_errors ?? Object.values(body)[0];
  if (typeof value === 'string') return value;
  return value?.[0] ?? fr.common.genericError;
}

async function rawRequest(path: string, method: Method, body: unknown, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null, fr.common.networkError);
  }
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const body = (data ?? null) as ApiErrorBody | null;
    throw new ApiError(response.status, body, firstMessage(body));
  }
  return data as T;
}

// Concurrent 401s share a single refresh call.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, signOut } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const response = await rawRequest('/api/auth/token/refresh/', 'POST', { refresh: refreshToken }, null);
    const tokens = await parse<TokenPair>(response);
    await setTokens(tokens);
    return tokens.access;
  } catch (error) {
    // Only a rejected token ends the session; a network failure keeps it.
    if (error instanceof ApiError && error.status !== 0) await signOut();
    return null;
  }
}

function refreshOnce(): Promise<string | null> {
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  if (!auth) return parse<T>(await rawRequest(path, method, body, null));

  let token = useAuthStore.getState().accessToken ?? (await refreshOnce());
  let response = await rawRequest(path, method, body, token);
  if (response.status === 401) {
    token = await refreshOnce();
    if (token) response = await rawRequest(path, method, body, token);
  }
  return parse<T>(response);
}
