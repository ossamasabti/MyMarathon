import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useNow } from '@/lib/useNow';
import { focusedSeconds, useFocusStore } from '@/stores/focusStore';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { FocusMode, FocusSession, Task } from './types';

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

export function useDeleteFocusSession() {
  const invalidate = useInvalidateFocus();
  return useMutation({
    mutationFn: (id: number) => apiRequest<null>(`/api/focus-sessions/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

/** Start the stopwatch (or a timer) on a task; a "to do" task becomes "in progress". */
export function useStartFocusOnTask() {
  const queryClient = useQueryClient();
  const start = useFocusStore((s) => s.start);
  return (task: Task, mode: FocusMode = 'stopwatch', plannedMinutes: number | null = null) => {
    start({ mode, taskId: task.id, taskTitle: task.title, plannedMinutes });
    if (task.status === 'todo') {
      void apiRequest<Task>(`/api/tasks/${task.id}/`, { method: 'PATCH', body: { status: 'in_progress' } })
        .then(() => invalidatePlanning(queryClient))
        .catch(() => undefined);
    }
  };
}

/**
 * Time spent on a task, live: the server total plus the running session's minutes not saved yet.
 * Ticks only for the task of the session in progress.
 */
export function useLiveTimeSpent(task: Pick<Task, 'id' | 'time_spent_seconds'>): number {
  const session = useFocusStore((s) => (s.session?.taskId === task.id ? s.session : null));
  const running = session !== null && session.pausedAt === null && session.endedAt === null;
  const now = useNow(running);
  if (!session) return task.time_spent_seconds;
  const unsaved = Math.max(0, focusedSeconds(session, now) - (session.syncedSeconds ?? 0));
  return task.time_spent_seconds + unsaved;
}
