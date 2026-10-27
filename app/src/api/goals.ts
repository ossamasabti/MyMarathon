import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { Goal, GoalInput, GoalNode } from './types';

export interface GoalFilters {
  domain?: number;
  horizon?: string;
  status?: string;
  parent?: number;
  root?: boolean;
}

function clean(filters: GoalFilters): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined)) as Record<
    string,
    string | number | boolean
  >;
}

export function useGoals(filters: GoalFilters = {}) {
  const params = clean(filters);
  return useQuery({
    queryKey: queryKeys.goals(params),
    queryFn: () => apiRequest<Goal[]>(`/api/goals/${toQuery(params)}`),
  });
}

export function useGoal(id: number) {
  return useQuery({
    queryKey: queryKeys.goal(id),
    queryFn: () => apiRequest<Goal>(`/api/goals/${id}/`),
    enabled: Number.isFinite(id),
  });
}

export function useGoalTree(domain?: number) {
  return useQuery({
    queryKey: queryKeys.tree(domain),
    queryFn: () => apiRequest<GoalNode[]>(`/api/goals/tree/${toQuery(domain ? { domain } : {})}`),
  });
}

export function useSaveGoal(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<GoalInput>) =>
      id === undefined
        ? apiRequest<Goal>('/api/goals/', { method: 'POST', body: input })
        : apiRequest<Goal>(`/api/goals/${id}/`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/goals/${id}/`, { method: 'DELETE' }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}
