"""Automatic summary of a period for guided reviews."""

from collections import defaultdict
from datetime import date

from django.utils import timezone

from .habits import completion, tracking_start
from .models import Goal, GoalStatus, Habit, HabitLog, Task, TaskStatus
from .rules import ProgressIndex, is_late


def _ref(goal: Goal, index: ProgressIndex) -> dict:
    return {
        "id": goal.id,
        "title": goal.title,
        "horizon": goal.horizon,
        "status": goal.status,
        "progress": round(index.progress(goal.id), 4),
        "domain_color": goal.domain.color if goal.domain_id else None,
    }


def build_summary(user, start: date, end: date, today: date) -> dict:
    index = ProgressIndex.for_user(user)

    done_tasks = list(
        Task.objects.filter(
            user=user, status=TaskStatus.DONE, completed_at__date__gte=start, completed_at__date__lte=end
        ).order_by("completed_at")
    )

    # A goal advanced when one of its tasks, or a task of one of its sub-goals, was completed.
    advanced: dict[int, int] = defaultdict(int)
    for task in done_tasks:
        if task.goal_id is None or task.goal_id not in index.goals:
            continue
        advanced[task.goal_id] += 1
        for ancestor in index.ancestors(task.goal_id):
            advanced[ancestor.id] += 1

    advanced_goals = sorted(
        (
            {**_ref(index.goals[goal_id], index), "tasks_done": count}
            for goal_id, count in advanced.items()
        ),
        key=lambda g: (-g["tasks_done"], g["title"]),
    )

    achieved = [
        _ref(goal, index)
        for goal in index.goals.values()
        if goal.status == GoalStatus.ACHIEVED
        and goal.achieved_at is not None
        and start <= timezone.localtime(goal.achieved_at).date() <= end
    ]

    habits = []
    logs = HabitLog.objects.filter(habit__user=user, done=True, date__gte=start, date__lte=end)
    done_by_habit: dict[int, set[date]] = defaultdict(set)
    for habit_id, day in logs.values_list("habit_id", "date"):
        done_by_habit[habit_id].add(day)
    for habit in Habit.objects.filter(user=user):
        done = done_by_habit[habit.id]
        # A habit created mid-period only counts from the day it started being tracked.
        rate = completion(habit, done, max(start, tracking_start(habit, done)), end, today)
        if rate is not None:
            habits.append(
                {"id": habit.id, "title": habit.title, "rate": round(rate, 4), "done": len(done)}
            )

    reference_day = min(end, today)
    late = [
        _ref(goal, index)
        for goal in index.goals.values()
        if goal.start_date <= end and goal.end_date >= start and is_late(goal, index.progress(goal.id), reference_day)
    ]

    return {
        "period_start": start,
        "period_end": end,
        "tasks_done": {
            "count": len(done_tasks),
            "items": [{"id": t.id, "title": t.title, "goal": t.goal_id} for t in done_tasks],
        },
        "goals_advanced": advanced_goals,
        "goals_achieved": achieved,
        "habits": habits,
        "goals_late": late,
    }
