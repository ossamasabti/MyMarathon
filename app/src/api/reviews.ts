import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { ISODate, Review, ReviewSummary, ReviewType } from './types';

export function useReviews(params: { type?: ReviewType; period_start?: ISODate } = {}) {
  const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Record<
    string,
    string
  >;
  return useQuery({
    queryKey: queryKeys.reviews(query),
    queryFn: () => apiRequest<Review[]>(`/api/reviews/${toQuery(query)}`),
  });
}

/** The review of one period, or null when it has not been written yet. */
export function usePeriodReview(type: ReviewType, start: ISODate) {
  const query = { type, period_start: start };
  return useQuery({
    queryKey: queryKeys.reviews(query),
    queryFn: () => apiRequest<Review[]>(`/api/reviews/${toQuery(query)}`),
    select: (reviews): Review | null => reviews[0] ?? null,
  });
}

export function useReviewSummary(type: ReviewType, start: ISODate) {
  return useQuery({
    queryKey: queryKeys.reviewSummary(type, start),
    queryFn: () => apiRequest<ReviewSummary>(`/api/reviews/summary/${toQuery({ type, period_start: start })}`),
  });
}

export function useSaveReview(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { type: ReviewType; period_start: ISODate; answers: Record<string, string> }) =>
      id === undefined
        ? apiRequest<Review>('/api/reviews/', { method: 'POST', body: input })
        : apiRequest<Review>(`/api/reviews/${id}/`, { method: 'PATCH', body: { answers: input.answers } }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}
