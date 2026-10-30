import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useNow } from '@/lib/useNow';
import { focusedSeconds, useFocusStore, type StartOptions } from '@/stores/focusStore';

import { apiRequest } from './client';
import { invalidatePlanning, queryKeys, toQuery } from './keys';
import type { FocusOverview, FocusSession, Task } from './types';

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

type StartOnTaskOptions = Omit<StartOptions, 'taskId' | 'taskTitle'>;

/** Start the stopwatch (or a timer, a cycle) on a task; a "to do" task becomes "in progress". */
export function useStartFocusOnTask() {
  const queryClient = useQueryClient();
  const start = useFocusStore((s) => s.start);
  return (task: Task, options: StartOnTaskOptions = { mode: 'stopwatch', plannedMinutes: null }) => {
    start({ ...options, taskId: task.id, taskTitle: task.title });
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

/** IANA time zone of the device ("Europe/Paris"): the server counts days in it. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

export function useFocusOverview() {
  const timeZone = deviceTimeZone();
  // Current UTC offset in minutes: the device clock wins if the server's zone data disagrees.
  const offset = -new Date().getTimezoneOffset();
  const params: Record<string, string | number> = timeZone ? { tz: timeZone, offset } : { offset };
  return useQuery({
    queryKey: queryKeys.focusOverview(`${timeZone}${offset}`),
    queryFn: () => apiRequest<FocusOverview>(`/api/focus-sessions/overview/${toQuery(params)}`),
  });
}

/** Focus time today, live: the server total plus the running session's seconds not saved yet. */
export function useLiveTodayFocus(overview: Pick<FocusOverview, 'today_seconds'>): number {
  const session = useFocusStore((s) => s.session);
  const running = session !== null && session.pausedAt === null && session.endedAt === null;
  const now = useNow(running);
  if (!session) return overview.today_seconds;
  return overview.today_seconds + Math.max(0, focusedSeconds(session, now) - (session.syncedSeconds ?? 0));
}
