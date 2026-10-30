export interface User {
  id: number;
  email: string;
  display_name: string;
  /** Daily focus goal, used for the focus streak. */
  focus_goal_minutes: number;
  date_joined: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface AuthResponse extends TokenPair {
  user: User;
}

/** DRF validation errors: field name (or "detail" / "non_field_errors") → messages. */
export type ApiErrorBody = Record<string, string[] | string>;

export type Horizon = 'vision' | 'annual' | 'quarterly' | 'monthly';
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'abandoned';
export type Priority = 'high' | 'normal' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type FocusMode = 'stopwatch' | 'timer';

/** ISO date "YYYY-MM-DD". */
export type ISODate = string;

export interface Domain {
  id: number;
  name: string;
  icon: string;
  color: string;
  order: number;
}

export interface DomainRef {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface GoalRef {
  id: number;
  title: string;
  horizon: Horizon;
}

export interface Goal {
  id: number;
  domain: number | null;
  parent: number | null;
  title: string;
  description: string;
  horizon: Horizon;
  start_date: ISODate;
  end_date: ISODate;
  status: GoalStatus;
  /** Decimal values are serialized as strings by DRF. */
  target_value: string | null;
  current_value: string | null;
  unit: string;
  created_at: string;
  updated_at: string;
  progress: number;
  is_late: boolean;
  ancestors: GoalRef[];
  children_count: number;
  task_counts: { total: number; done: number };
}

export interface GoalInput {
  title: string;
  description?: string;
  horizon: Horizon;
  start_date: ISODate;
  end_date: ISODate;
  domain?: number | null;
  parent?: number | null;
  status?: GoalStatus;
  target_value?: string | null;
  current_value?: string | null;
  unit?: string;
}

export interface TreeTask {
  id: number;
  title: string;
  status: TaskStatus;
  priority: Priority;
}

export interface GoalNode {
  id: number;
  title: string;
  horizon: Horizon;
  status: GoalStatus;
  start_date: ISODate;
  end_date: ISODate;
  domain: DomainRef | null;
  progress: number;
  is_late: boolean;
  children: GoalNode[];
  tasks: TreeTask[];
}

export interface Task {
  id: number;
  goal: number | null;
  title: string;
  notes: string;
  due_date: ISODate | null;
  planned_date: ISODate | null;
  /** "HH:MM:SS", only on a planned day. */
  start_time: string | null;
  end_time: string | null;
  priority: Priority;
  estimated_minutes: number | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  goal_path: GoalRef[];
  domain: DomainRef | null;
  /** Total of the task's focus sessions. */
  time_spent_seconds: number;
}

export interface TaskInput {
  title?: string;
  goal?: number | null;
  notes?: string;
  due_date?: ISODate | null;
  planned_date?: ISODate | null;
  /** "HH:MM". */
  start_time?: string | null;
  end_time?: string | null;
  priority?: Priority;
  estimated_minutes?: number | null;
  status?: TaskStatus;
}

export interface TodayTasks {
  overdue: Task[];
  today: Task[];
  done: Task[];
}

export type Frequency = 'daily' | 'weekly';

export interface Habit {
  id: number;
  goal: number | null;
  title: string;
  frequency: Frequency;
  /** Weekdays, Monday = 0. Empty for a daily habit = every day. */
  days: number[];
  created_at: string;
  goal_path: GoalRef[];
  domain: DomainRef | null;
  streak: number;
  done_today: boolean;
  due_today: boolean;
  completion_30d: number | null;
}

export interface HabitInput {
  title: string;
  goal: number;
  frequency: Frequency;
  days: number[];
}

export interface HabitLog {
  date: ISODate;
  done: boolean;
}

export type ReviewType = 'weekly' | 'monthly' | 'quarterly';

export interface Review {
  id: number;
  type: ReviewType;
  period_start: ISODate;
  period_end: ISODate;
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface SummaryGoal {
  id: number;
  title: string;
  horizon: Horizon;
  status: GoalStatus;
  progress: number;
  domain_color: string | null;
}

export interface ReviewSummary {
  period_start: ISODate;
  period_end: ISODate;
  tasks_done: { count: number; items: { id: number; title: string; goal: number | null }[] };
  goals_advanced: (SummaryGoal & { tasks_done: number })[];
  goals_achieved: SummaryGoal[];
  habits: { id: number; title: string; rate: number; done: number }[];
  goals_late: SummaryGoal[];
}

export interface Stats {
  domains: {
    id: number | null;
    name: string | null;
    color: string | null;
    active: number;
    achieved: number;
    late: number;
    progress: number | null;
  }[];
  weekly_tasks: { week_start: ISODate; count: number }[];
  late_goals: (Omit<SummaryGoal, 'status'> & { expected: number; end_date: ISODate })[];
  totals: {
    tasks_done_30d: number;
    goals_achieved: number;
    goals_active: number;
    habits_rate_30d: number | null;
    focus_seconds_30d: number;
  };
}

export interface FocusSession {
  id: number;
  task: number | null;
  task_title: string | null;
  mode: FocusMode;
  started_at: string;
  ended_at: string;
  /** Focused time, pauses excluded. */
  duration_seconds: number;
  planned_minutes: number | null;
  intention: string;
  /** Self-assessed focus quality, 1 to 5. */
  quality: number | null;
  distractions: number;
  captured_notes: string[];
  created_at: string;
}

export interface FocusSessionInput {
  task: number | null;
  mode: FocusMode;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  planned_minutes: number | null;
  intention: string;
  distractions: number;
  captured_notes: string[];
}

export type FocusBadgeKey =
  | 'first_session'
  | 'hours_1'
  | 'hours_10'
  | 'hours_50'
  | 'hours_100'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'timers_10'
  | 'timers_50'
  | 'deep_work'
  | 'top_quality_10'
  | 'early_bird';

export interface FocusBadge {
  key: FocusBadgeKey;
  unlocked: boolean;
  progress: number;
  target: number;
}

/** GET /api/focus-sessions/overview/: days counted in the device's time zone. */
export interface FocusOverview {
  today: ISODate;
  today_seconds: number;
  goal_minutes: number;
  /** Consecutive days reaching the goal (today not reached yet does not break it). */
  streak: number;
  best_streak: number;
  records: {
    best_day: { date: ISODate; seconds: number } | null;
    longest_session_seconds: number;
    total_seconds: number;
    sessions: number;
  };
  /** Seconds per day, from a Monday 11 weeks ago to today. */
  heatmap: { date: ISODate; seconds: number }[];
  /** Seconds per clock hour (0-23) over the last 30 days. */
  by_hour: number[];
  by_domain: { domain: { id: number; name: string; color: string; icon: string } | null; seconds: number }[];
  quality_avg_30d: number | null;
  badges: FocusBadge[];
}
