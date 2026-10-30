import { useTask } from '@/api/tasks';
import { FocusProgress } from '@/components/focus/FocusProgress';
import { FocusTodayCard } from '@/components/focus/FocusTodayCard';
import { RestScreen } from '@/components/focus/RestScreen';
import { RunningSession } from '@/components/focus/RunningSession';
import { SetupForm } from '@/components/focus/SetupForm';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { fr } from '@/i18n/fr';
import { useNumberParam } from '@/lib/params';
import { useFocusStore } from '@/stores/focusStore';

export default function FocusScreen() {
  const session = useFocusStore((s) => s.session);
  const rest = useFocusStore((s) => s.rest);
  // The task passed as `?task=`, when there is one.
  const taskParam = useNumberParam('task');
  const requested = Number.isFinite(taskParam);
  const paramTask = useTask(taskParam);
  const initialTask = requested ? (paramTask.data ?? null) : null;

  return (
    <Screen>
      <Header title={fr.focus.title} />
      {session ? (
        <RunningSession session={session} paramTask={initialTask} />
      ) : rest ? (
        <RestScreen rest={rest} />
      ) : requested && paramTask.isPending ? (
        <LoadingState />
      ) : requested && paramTask.isError ? (
        <ErrorState message={paramTask.error.message} onRetry={() => paramTask.refetch()} />
      ) : (
        <>
          <FocusTodayCard showStart={false} />
          {/* Remount the form when the task changes so its defaults (timer length) follow. */}
          <SetupForm key={initialTask?.id ?? 'free'} initialTask={initialTask} />
          <FocusProgress />
        </>
      )}
    </Screen>
  );
}
