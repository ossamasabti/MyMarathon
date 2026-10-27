import type { QueryClient } from '@tanstack/react-query';

/** Centralized TanStack Query keys. Prefix matching drives invalidation. */
export const queryKeys = {
  domains: ['domains'] as const,
  goals: (params: Record<string, string | number | boolean> = {}) => ['goals', params] as const,
  goal: (id: number) => ['goal', id] as const,
  tree: (domain?: number) => ['tree', domain ?? 'all'] as const,
  tasks: (params: Record<string, string | number> = {}) => ['tasks', params] as const,
  task: (id: number) => ['task', id] as const,
  today: ['tasks', 'today'] as const,
};

/** Goals, tasks and progress depend on each other: refresh them together after any write. */
export function invalidatePlanning(queryClient: QueryClient) {
  return Promise.all(
    ['goals', 'goal', 'tree', 'tasks', 'task'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  );
}

export function toQuery(params: Record<string, string | number | boolean>): string {
  const entries = Object.entries(params).map(([k, v]) => [k, String(v)]);
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}
