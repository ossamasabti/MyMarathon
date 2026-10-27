import { useLocalSearchParams } from 'expo-router';

/** Read a numeric route/search param; NaN when missing or invalid. */
export function useNumberParam(name: string): number {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const raw = params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? Number(value) : Number.NaN;
}
