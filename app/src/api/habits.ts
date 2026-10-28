import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { Habit, HabitInput, HabitLog, ISODate } from './types';

export function useHabits(params: { goal?: number } = {}) {
  const query: Record<string, number> = params.goal === undefined ? {} : { goal: params.goal };
  return useQuery({
    queryKey: queryKeys.habits(query),
    queryFn: () => apiRequest<Habit[]>(`/api/habits/${toQuery(query)}`),
  });
}

export function useTodayHabits() {
  return useQuery({
    queryKey: queryKeys.habitsToday,
    queryFn: () => apiRequest<Habit[]>('/api/habits/today/'),
  });
}

export function useHabit(id: number) {
  return useQuery({
    queryKey: queryKeys.habit(id),
    queryFn: () => apiRequest<Habit>(`/api/habits/${id}/`),
    enabled: Number.isFinite(id),
  });
}

export function useHabitLogs(id: number, from: ISODate, to: ISODate) {
  return useQuery({
    queryKey: queryKeys.habitLogs(id, from, to),
    queryFn: () => apiRequest<HabitLog[]>(`/api/habits/${id}/logs/${toQuery({ from, to })}`),
    enabled: Number.isFinite(id),
  });
}

export function useSaveHabit(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<HabitInput>) =>
      id === undefined
        ? apiRequest<Habit>('/api/habits/', { method: 'POST', body: input })
        : apiRequest<Habit>(`/api/habits/${id}/`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/habits/${id}/`, { method: 'DELETE' }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

/** Check / uncheck a day (today by default); lists update immediately. */
export function useCheckHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done, date }: { id: number; done: boolean; date?: ISODate }) =>
      apiRequest<Habit>(`/api/habits/${id}/check/`, { method: 'POST', body: { done, ...(date ? { date } : {}) } }),
    onMutate: async ({ id, done, date }) => {
      if (date) return; // past days: the history grid refetches
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      queryClient.setQueriesData<Habit[]>({ queryKey: ['habits'] }, (data) =>
        Array.isArray(data) ? data.map((h) => (h.id === id ? { ...h, done_today: done } : h)) : data,
      );
    },
    onSettled: () => invalidatePlanning(queryClient),
  });
}
