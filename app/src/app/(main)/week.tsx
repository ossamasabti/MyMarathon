import { router, useLocalSearchParams } from 'expo-router';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useMoveTask, useUnplannedTasks, useWeekTasks } from '@/api/tasks';
import type { ISODate, Task } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { MoveTaskDialog } from '@/components/MoveTaskDialog';
import { QuickAddTask } from '@/components/QuickAddTask';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { TaskRow } from '@/components/TaskRow';
import { fr } from '@/i18n/fr';
import { dayLabel, dayLongLabel, startOfWeek, weekDays, weekLabel } from '@/lib/calendar';
import { addDays, todayISO } from '@/lib/dates';
import { radius, spacing } from '@/theme/colors';
import { useIsWide, useTheme } from '@/theme/useTheme';

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Narrowest readable day column; below that the week scrolls horizontally. */
const DAY_MIN_WIDTH = 210;
const GRID_GAP = spacing.sm;
const ColumnWidthContext = createContext(DAY_MIN_WIDTH);

export default function WeekScreen() {
  const params = useLocalSearchParams<{ start?: string }>();
  const start = params.start && ISO_PATTERN.test(params.start) ? startOfWeek(params.start) : startOfWeek();
  const days = weekDays(start);
  const wide = useIsWide();
  const theme = useTheme();

  const week = useWeekTasks(start);
  const unplanned = useUnplannedTasks();
  const move = useMoveTask();
  const [moving, setMoving] = useState<Task | null>(null);

  // The week lives in the URL so that reloads and links keep it.
  const showWeek = (next: ISODate) => router.setParams({ start: next });
  const moveTask = (task: Task, plannedDate: ISODate | null) => {
    setMoving(null);
    move.mutate({ id: task.id, plannedDate });
  };

  const tasksByDay = new Map<ISODate, Task[]>(days.map((d) => [d, []]));
  for (const task of week.data ?? []) {
    if (task.planned_date) tasksByDay.get(task.planned_date)?.push(task);
  }

  return (
    <Screen title={fr.nav.week} fullWidth={wide}>
      <View style={styles.toolbar}>
        <IconButton icon="chevron-back" label={fr.screens.week.previous} onPress={() => showWeek(addDays(start, -7))} />
        <AppText variant="heading" style={styles.weekLabel} accessibilityLiveRegion="polite">
          {weekLabel(start)}
        </AppText>
        <IconButton icon="chevron-forward" label={fr.screens.week.next} onPress={() => showWeek(addDays(start, 7))} />
        {start !== startOfWeek() ? (
          <Button label={fr.screens.week.current} variant="ghost" onPress={() => showWeek(startOfWeek())} />
        ) : null}
      </View>

      {move.isError ? (
        <AppText color={theme.danger} accessibilityRole="alert">
          {move.error.message}
        </AppText>
      ) : null}

      {week.isPending ? (
        <LoadingState />
      ) : week.isError ? (
        <ErrorState message={week.error.message} onRetry={() => week.refetch()} />
      ) : (
        <WeekGrid wide={wide}>
          {days.map((day) => (
            <DayColumn
              key={day}
              day={day}
              tasks={tasksByDay.get(day) ?? []}
              wide={wide}
              onMove={setMoving}
              onShift={(task, delta) => moveTask(task, addDays(day, delta))}
            />
          ))}
        </WeekGrid>
      )}

      <Section title={fr.screens.week.unplanned}>
        {unplanned.isPending ? (
          <LoadingState />
        ) : unplanned.isError ? (
          <ErrorState message={unplanned.error.message} onRetry={() => unplanned.refetch()} />
        ) : unplanned.data.length === 0 ? (
          <EmptyState message={fr.screens.week.unplannedEmpty} />
        ) : (
          unplanned.data.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              footer={<Button label={fr.screens.week.move} variant="secondary" onPress={() => setMoving(task)} />}
            />
          ))
        )}
      </Section>

      <MoveTaskDialog task={moving} days={days} onMove={moveTask} onClose={() => setMoving(null)} />
    </Screen>
  );
}

/** Columns share the available width, down to DAY_MIN_WIDTH; below that the week scrolls horizontally. */
function WeekGrid({ wide, children }: { wide: boolean; children: ReactNode }) {
  const [available, setAvailable] = useState(0);
  if (!wide) return <View style={styles.list}>{children}</View>;
  const columnWidth = Math.max(DAY_MIN_WIDTH, (available - GRID_GAP * 6) / 7);
  return (
    <View onLayout={(e) => setAvailable(e.nativeEvent.layout.width)}>
      <ScrollView horizontal contentContainerStyle={styles.grid}>
        <ColumnWidthContext.Provider value={columnWidth}>{children}</ColumnWidthContext.Provider>
      </ScrollView>
    </View>
  );
}

interface DayColumnProps {
  day: ISODate;
  tasks: Task[];
  wide: boolean;
  onMove: (task: Task) => void;
  onShift: (task: Task, delta: number) => void;
}

function DayColumn({ day, tasks, wide, onMove, onShift }: DayColumnProps) {
  const theme = useTheme();
  const columnWidth = useContext(ColumnWidthContext);
  const isToday = day === todayISO();
  const minutes = tasks.reduce((sum, t) => sum + (t.status === 'done' ? 0 : (t.estimated_minutes ?? 0)), 0);

  return (
    <View
      accessibilityLabel={dayLongLabel(day)}
      style={[
        styles.day,
        wide && { width: columnWidth },
        {
          backgroundColor: theme.surface,
          borderColor: isToday ? theme.primary : theme.border,
          borderWidth: isToday ? 2 : 1,
        },
      ]}>
      <View style={styles.dayHeader}>
        <AppText variant="heading" color={isToday ? theme.primary : theme.text}>
          {dayLabel(day)}
        </AppText>
        {isToday ? <AppText variant="small" color={theme.primary}>{fr.screens.week.today}</AppText> : null}
      </View>
      {tasks.length ? (
        <AppText variant="small">
          {fr.screens.week.taskCount(tasks.length)}
          {minutes ? ` · ${fr.screens.week.minutes(minutes)}` : ''}
        </AppText>
      ) : (
        <AppText variant="small">{fr.screens.week.noTask}</AppText>
      )}

      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          footer={
            <>
              {wide ? (
                <IconButton icon="arrow-back" label={fr.screens.week.dayEarlier(task.title)} onPress={() => onShift(task, -1)} />
              ) : null}
              <IconButton icon="calendar-outline" label={fr.screens.week.moveTitle(task.title)} onPress={() => onMove(task)} />
              {wide ? (
                <IconButton icon="arrow-forward" label={fr.screens.week.dayLater(task.title)} onPress={() => onShift(task, 1)} />
              ) : null}
            </>
          }
        />
      ))}

      <QuickAddTask plannedDate={day} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  weekLabel: { minWidth: 160, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: GRID_GAP, alignItems: 'stretch' },
  list: { gap: spacing.sm },
  day: { padding: spacing.sm, gap: spacing.xs, borderRadius: radius.lg },
  dayHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.xs },
});
