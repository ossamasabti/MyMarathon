import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { ReadingStatus, Reference, ReferenceInput } from './types';

export interface ReferenceFilters {
  status?: ReadingStatus;
  goal?: number;
  tag?: string;
  /** Words searched in the title, authors, venue, DOI and keywords. */
  q?: string;
}

function clean(filters: ReferenceFilters): Record<string, string | number> {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')) as Record<
    string,
    string | number
  >;
}

export function useReferences(filters: ReferenceFilters = {}) {
  const params = clean(filters);
  return useQuery({
    queryKey: queryKeys.references(params),
    queryFn: () => apiRequest<Reference[]>(`/api/references/${toQuery(params)}`),
    placeholderData: (previous) => previous,
  });
}

export function useReference(id: number) {
  return useQuery({
    queryKey: queryKeys.reference(id),
    queryFn: () => apiRequest<Reference>(`/api/references/${id}/`),
    enabled: Number.isFinite(id),
  });
}

export function useReferenceTags() {
  return useQuery({
    queryKey: queryKeys.referenceTags,
    queryFn: () => apiRequest<{ tag: string; count: number }[]>('/api/references/tags/'),
  });
}

export function exportBibtex(filters: ReferenceFilters = {}) {
  return apiRequest<{ count: number; bibtex: string }>(`/api/references/export/${toQuery(clean(filters))}`);
}

export function useSaveReference(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ReferenceInput>) =>
      id === undefined
        ? apiRequest<Reference>('/api/references/', { method: 'POST', body: input })
        : apiRequest<Reference>(`/api/references/${id}/`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useDeleteReference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/references/${id}/`, { method: 'DELETE' }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

/** Change the reading status; every cached list shows it immediately. */
export function useSetReadingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReadingStatus }) =>
      apiRequest<Reference>(`/api/references/${id}/`, { method: 'PATCH', body: { status } }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['references'] });
      queryClient.setQueriesData<Reference[]>({ queryKey: ['references'] }, (data) =>
        Array.isArray(data) ? data.map((ref) => (ref.id === id ? { ...ref, status } : ref)) : data,
      );
    },
    onSettled: () => invalidatePlanning(queryClient),
  });
}

/** Next status when tapping the status button: À lire → En cours → Lu → À lire. */
export function nextReadingStatus(status: ReadingStatus): ReadingStatus {
  return status === 'to_read' ? 'reading' : status === 'reading' ? 'read' : 'to_read';
}
