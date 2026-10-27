export interface User {
  id: number;
  email: string;
  display_name: string;
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
  priority: Priority;
  estimated_minutes: number | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  goal_path: GoalRef[];
  domain: DomainRef | null;
}

export interface TaskInput {
  title?: string;
  goal?: number | null;
  notes?: string;
  due_date?: ISODate | null;
  planned_date?: ISODate | null;
  priority?: Priority;
  estimated_minutes?: number | null;
  status?: TaskStatus;
}

export interface TodayTasks {
  overdue: Task[];
  today: Task[];
  done: Task[];
}
