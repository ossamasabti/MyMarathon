import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { FocusSession, FocusSessionInput } from './types';

export function useFocusSessions(params: Record<string, string | number> = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.focusSessions(params),
    queryFn: () => apiRequest<FocusSession[]>(`/api/focus-sessions/${toQuery(params)}`),
    enabled,
  });
}

/** Sessions change the time spent on tasks and the stats: refresh them too. */
function useInvalidateFocus() {
  const queryClient = useQueryClient();
  return () => Promise.all([queryClient.invalidateQueries({ queryKey: ['focus'] }), invalidatePlanning(queryClient)]);
}

export function useSaveFocusSession() {
  const invalidate = useInvalidateFocus();
  return useMutation({
    mutationFn: (input: FocusSessionInput) =>
      apiRequest<FocusSession>('/api/focus-sessions/', { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useDeleteFocusSession() {
  const invalidate = useInvalidateFocus();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/focus-sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
