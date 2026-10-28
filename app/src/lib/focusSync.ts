import type { QueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/api/client';
import { invalidatePlanning } from '@/api/keys';
import type { FocusSession, FocusSessionInput } from '@/api/types';
import { focusedSeconds, useFocusStore, type ActiveFocusSession } from '@/stores/focusStore';

/** Under a minute, nothing is counted. */
export const MIN_COUNTED_SECONDS = 60;

/** One save at a time: a second call waits for the first (no duplicate POST). */
let queue: Promise<void> = Promise.resolve();

function refresh(queryClient: QueryClient) {
  return Promise.all([queryClient.invalidateQueries({ queryKey: ['focus'] }), invalidatePlanning(queryClient)]);
}

/** Whether the server copy is behind: each new whole minute while running, any change once paused or stopped. */
function needsSave(session: ActiveFocusSession, seconds: number): boolean {
  if (seconds < MIN_COUNTED_SECONDS) return false;
  const synced = session.syncedSeconds ?? 0;
  const running = session.pausedAt === null && session.endedAt === null;
  return running ? Math.floor(seconds / 60) > Math.floor(synced / 60) : seconds !== synced;
}

async function save(queryClient: QueryClient): Promise<void> {
  const store = useFocusStore.getState();
  const session = store.session;
  if (!session) return;
  const now = Date.now();
  const seconds = focusedSeconds(session, now);
  if (!needsSave(session, seconds)) return;

  const body: FocusSessionInput = {
    task: session.taskId,
    mode: session.mode,
    started_at: new Date(session.startedAt).toISOString(),
    ended_at: new Date(session.endedAt ?? session.pausedAt ?? now).toISOString(),
    duration_seconds: seconds,
    planned_minutes: session.plannedMinutes,
  };
  try {
    const saved =
      session.serverId == null
        ? await apiRequest<FocusSession>('/api/focus-sessions/', { method: 'POST', body })
        : await apiRequest<FocusSession>(`/api/focus-sessions/${session.serverId}/`, { method: 'PATCH', body });
    useFocusStore.getState().markSynced(session.startedAt, saved.id, seconds);
    await refresh(queryClient);
  } catch {
    useFocusStore.getState().setSyncError(true);
  }
}

/** Save the current session's progress if it is behind; safe to call often. */
export function syncFocus(queryClient: QueryClient): Promise<void> {
  queue = queue.then(() => save(queryClient));
  return queue;
}

/** Drop the current session, and its minutes already added to the task. */
export function discardFocus(queryClient: QueryClient): Promise<void> {
  const run = queue.then(async () => {
    const session = useFocusStore.getState().session;
    if (session?.serverId != null) {
      await apiRequest<null>(`/api/focus-sessions/${session.serverId}/`, { method: 'DELETE' });
      await refresh(queryClient);
    }
    useFocusStore.getState().clear();
  });
  // A failed delete must not block later saves.
  queue = run.catch(() => undefined);
  return run;
}
