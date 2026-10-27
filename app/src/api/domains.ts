import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys } from './keys';
import type { Domain } from './types';

export type DomainInput = Pick<Domain, 'name' | 'icon' | 'color'> & { order?: number };

export function useDomains() {
  return useQuery({
    queryKey: queryKeys.domains,
    queryFn: () => apiRequest<Domain[]>('/api/domains/'),
  });
}

export function useSaveDomain(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DomainInput) =>
      id === undefined
        ? apiRequest<Domain>('/api/domains/', { method: 'POST', body: input })
        : apiRequest<Domain>(`/api/domains/${id}/`, { method: 'PATCH', body: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.domains });
      await invalidatePlanning(queryClient);
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/domains/${id}/`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.domains });
      await invalidatePlanning(queryClient);
    },
  });
}
