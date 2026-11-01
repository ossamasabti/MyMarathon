import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Horizon } from './types';
import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';

export interface PhdTemplateParams {
  start_date: string;
  years: 3 | 4;
  thesis_title: string;
}

export interface PlannedGoal {
  title: string;
  horizon: Horizon;
  start_date: string;
  end_date: string;
  description: string;
  target_value: string | null;
  unit: string;
  tasks: { title: string; due_date: string }[];
  habits: { title: string; frequency: 'daily' | 'weekly'; days: number[] }[];
  children: PlannedGoal[];
}

export interface PlanCounts {
  goals: number;
  tasks: number;
  habits: number;
}

/** Preview of the PhD plan: nothing is saved. Disabled until the parameters are complete. */
export function usePhdPreview(params: PhdTemplateParams | null) {
  return useQuery({
    queryKey: ['templates', 'phd', params],
    queryFn: params
      ? () => apiRequest<{ plan: PlannedGoal; counts: PlanCounts }>(`/api/templates/phd/${toQuery({ ...params })}`)
      : skipToken,
    placeholderData: (previous) => previous,
  });
}

export function useApplyPhdTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PhdTemplateParams & { domain_name: string }) =>
      apiRequest<{ domain_id: number; vision_id: number; counts: PlanCounts }>('/api/templates/phd/', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () =>
      Promise.all([
        invalidatePlanning(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.domains }),
      ]),
  });
}
