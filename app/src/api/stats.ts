import { useQuery } from '@tanstack/react-query';

import { apiRequest } from './client';
import { toQuery } from './keys';
import type { Stats } from './types';

export function useStats(weeks = 12) {
  return useQuery({
    // Under 'goals' so that invalidatePlanning() refreshes it after any write.
    queryKey: ['goals', 'stats', weeks],
    queryFn: () => apiRequest<Stats>(`/api/stats/${toQuery({ weeks })}`),
  });
}
