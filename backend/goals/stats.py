"""Statistics screen: progress by domain, tasks completed per week, late goals."""

from collections import defaultdict
from datetime import date, timedelta

from django.db.models import Sum
from django.utils import timezone

from .habits import completion, tracking_start
from .models import Domain, FocusSession, GoalStatus, Habit, HabitLog, Task, TaskStatus
from .rules import ProgressIndex, expected_progress, is_late


def build_stats(user, today: date, weeks: int) -> dict:
    index = ProgressIndex.for_user(user)
    goals = index.goals

    # --- Progress by domain (roots of each domain, abandoned excluded) ---------
    by_domain: dict[int | None, list] = defaultdict(list)
    for goal in goals.values():
        if goal.status == GoalStatus.ABANDONED:
            continue
        parent = goals.get(goal.parent_id) if goal.parent_id else None
        is_domain_root = parent is None or parent.domain_id != goal.domain_id
        by_domain[goal.domain_id].append((goal, is_domain_root))

    domains_out = []
    domain_rows = [(d.id, d.name, d.color) for d in Domain.objects.filter(user=user)]
    if None in by_domain:
        domain_rows.append((None, None, None))
    for domain_id, name, color in domain_rows:
        entries = by_domain.get(domain_id, [])
        roots = [g for g, root in entries if root]
        progress = sum(index.progress(g.id) for g in roots) / len(roots) if roots else None
        domains_out.append(
            {
                "id": domain_id,
                "name": name,
                "color": color,
                "active": sum(1 for g, _ in entries if g.status == GoalStatus.ACTIVE),
                "achieved": sum(1 for g, _ in entries if g.status == GoalStatus.ACHIEVED),
                "late": sum(1 for g, _ in entries if is_late(g, index.progress(g.id), today)),
                "progress": None if progress is None else round(progress, 4),
            }
        )

    # --- Tasks completed per week (Monday → Sunday), empty weeks included -----
    this_monday = today - timedelta(days=today.weekday())
    first_monday = this_monday - timedelta(weeks=weeks - 1)
    counts: dict[date, int] = defaultdict(int)
    completed = Task.objects.filter(
        user=user, status=TaskStatus.DONE, completed_at__date__gte=first_monday, completed_at__date__lte=today
    ).values_list("completed_at", flat=True)
    for completed_at in completed:
        day = timezone.localtime(completed_at).date()
        counts[day - timedelta(days=day.weekday())] += 1
    weekly = [
        {"week_start": first_monday + timedelta(weeks=i), "count": counts[first_monday + timedelta(weeks=i)]}
        for i in range(weeks)
    ]

    # --- Late goals -----------------------------------------------------------
    late = sorted(
        (
            {
                "id": g.id,
                "title": g.title,
                "horizon": g.horizon,
                "domain_color": g.domain.color if g.domain_id else None,
                "progress": round(index.progress(g.id), 4),
                "expected": round(expected_progress(g, today), 4),
                "end_date": g.end_date,
            }
            for g in goals.values()
            if is_late(g, index.progress(g.id), today)
        ),
        key=lambda g: g["progress"] - g["expected"],
    )

    # --- Totals ---------------------------------------------------------------
    month_ago = today - timedelta(days=29)
    done_30d = Task.objects.filter(user=user, status=TaskStatus.DONE, completed_at__date__gte=month_ago).count()
    done_by_habit: dict[int, set] = defaultdict(set)
    for habit_id, day in HabitLog.objects.filter(
        habit__user=user, done=True, date__gte=month_ago
    ).values_list("habit_id", "date"):
        done_by_habit[habit_id].add(day)
    rates = []
    for habit in Habit.objects.filter(user=user):
        done = done_by_habit[habit.id]
        rate = completion(habit, done, max(month_ago, tracking_start(habit, done)), today, today)
        if rate is not None:
            rates.append(rate)

    focus_30d = FocusSession.objects.filter(user=user, started_at__date__gte=month_ago).aggregate(
        total=Sum("duration_seconds")
    )["total"]

    return {
        "domains": domains_out,
        "weekly_tasks": weekly,
        "late_goals": late,
        "totals": {
            "tasks_done_30d": done_30d,
            "goals_achieved": sum(1 for g in goals.values() if g.status == GoalStatus.ACHIEVED),
            "goals_active": sum(1 for g in goals.values() if g.status == GoalStatus.ACTIVE),
            "habits_rate_30d": round(sum(rates) / len(rates), 4) if rates else None,
            "focus_seconds_30d": focus_30d or 0,
        },
    }
