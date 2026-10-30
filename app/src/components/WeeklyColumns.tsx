import type { ISODate } from '@/api/types';
import { fr } from '@/i18n/fr';
import { formatDate } from '@/lib/dates';

import { ColumnChart } from './ColumnChart';

interface WeeklyColumnsProps {
  weeks: { week_start: ISODate; count: number }[];
}

/** Tasks completed per week: the current week in the accent, the record and current week labelled. */
export function WeeklyColumns({ weeks }: WeeklyColumnsProps) {
  const max = Math.max(...weeks.map((w) => w.count), 0);
  const lastIndex = weeks.length - 1;
  const recordIndex = max > 0 ? weeks.findIndex((w) => w.count === max) : -1;
  const total = weeks.reduce((sum, w) => sum + w.count, 0);

  return (
    <ColumnChart
      bars={weeks.map((week, index) => ({
        key: week.week_start,
        value: week.count,
        // Every other week, to avoid colliding labels.
        axisLabel: index % 2 === lastIndex % 2 ? formatDate(week.week_start) : '',
        description: fr.screens.stats.weekBar(formatDate(week.week_start), week.count),
        tableLabel: formatDate(week.week_start),
      }))}
      accentIndex={lastIndex}
      labelledIndexes={[lastIndex, recordIndex]}
      defaultIndex={lastIndex}
      formatValue={String}
      summary={fr.screens.stats.weeklySummary(total, max, weeks[lastIndex]?.count ?? 0)}
      tableHeaders={[fr.screens.stats.weekColumn, fr.screens.stats.countColumn]}
    />
  );
}
