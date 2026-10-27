import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { Task, TaskInput, TaskStatus, TodayTasks } from './types';

export function useTodayTasks() {
  return useQuery({
    queryKey: queryKeys.today,
    queryFn: () => apiRequest<TodayTasks>('/api/tasks/today/'),
  });
}

export function useTasks(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(params),
    queryFn: () => apiRequest<Task[]>(`/api/tasks/${toQuery(params)}`),
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => apiRequest<Task>(`/api/tasks/${id}/`),
    enabled: Number.isFinite(id),
  });
}

export function useSaveTask(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) =>
      id === undefined
        ? apiRequest<Task>('/api/tasks/', { method: 'POST', body: input })
        : apiRequest<Task>(`/api/tasks/${id}/`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/tasks/${id}/`, { method: 'DELETE' }),
    onSuccess: () => invalidatePlanning(queryClient),
  });
}

type TaskCache = Task[] | TodayTasks | Task | undefined;

function patchCached(data: TaskCache, id: number, status: TaskStatus): TaskCache {
  const patch = (t: Task) => (t.id === id ? { ...t, status } : t);
  if (!data) return data;
  if (Array.isArray(data)) return data.map(patch);
  if ('overdue' in data) {
    return { overdue: data.overdue.map(patch), today: data.today.map(patch), done: data.done.map(patch) };
  }
  return patch(data);
}

function applyOptimisticStatus(queryClient: QueryClient, id: number, status: TaskStatus) {
  queryClient.setQueriesData<TaskCache>({ queryKey: ['tasks'] }, (data) => patchCached(data, id, status));
  queryClient.setQueriesData<TaskCache>({ queryKey: queryKeys.task(id) }, (data) => patchCached(data, id, status));
}

/** Check / uncheck a task, updating every cached list immediately. */
export function useToggleTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      apiRequest<Task>(`/api/tasks/${id}/`, { method: 'PATCH', body: { status: done ? 'done' : 'todo' } }),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      applyOptimisticStatus(queryClient, id, done ? 'done' : 'todo');
    },
    onSettled: () => invalidatePlanning(queryClient),
  });
}
