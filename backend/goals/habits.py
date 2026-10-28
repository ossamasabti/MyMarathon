"""Habit scheduling rules: what is due, streaks and completion rates.

Functions take the set of dates the habit was done, so they stay pure and testable.
"""

from datetime import date, timedelta
from typing import AbstractSet

from django.utils import timezone

from .models import Frequency, Habit

MAX_LOOKBACK_DAYS = 366


def week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def scheduled_weekdays(habit: Habit) -> set[int]:
    """Weekdays (Monday = 0) on which the habit can be done."""
    days = set(habit.days or [])
    return days if days else set(range(7))


def is_due(habit: Habit, day: date, done_dates: AbstractSet[date]) -> bool:
    """Whether the habit should appear as "to do" on `day`."""
    if day.weekday() not in scheduled_weekdays(habit):
        return False
    if habit.frequency == Frequency.WEEKLY:
        # Once a week: another day of the same week already counts.
        monday = week_start(day)
        done_this_week = any(monday <= d <= monday + timedelta(days=6) and d != day for d in done_dates)
        return not done_this_week
    return True


def streak(habit: Habit, done_dates: AbstractSet[date], today: date) -> int:
    """Consecutive successful occurrences (days, or weeks for a weekly habit) up to today.

    The current day / week not done yet does not break the streak.
    """
    if habit.frequency == Frequency.WEEKLY:
        return _weekly_streak(done_dates, today)

    weekdays = scheduled_weekdays(habit)
    count = 0
    for offset in range(MAX_LOOKBACK_DAYS):
        day = today - timedelta(days=offset)
        if day.weekday() not in weekdays:
            continue
        if day in done_dates:
            count += 1
        elif day != today:
            break
    return count


def _weekly_streak(done_dates: AbstractSet[date], today: date) -> int:
    count = 0
    monday = week_start(today)
    for weeks_back in range(MAX_LOOKBACK_DAYS // 7):
        start = monday - timedelta(weeks=weeks_back)
        done = any(start <= d <= start + timedelta(days=6) for d in done_dates)
        if done:
            count += 1
        elif weeks_back > 0:
            break
    return count


def completion(habit: Habit, done_dates: AbstractSet[date], start: date, end: date, today: date) -> float | None:
    """Done / scheduled occurrences between start and end (future days excluded); None if nothing was due."""
    end = min(end, today)
    if end < start:
        return None
    if habit.frequency == Frequency.WEEKLY:
        weeks = []
        monday = week_start(start)
        while monday <= end:
            weeks.append(monday)
            monday += timedelta(weeks=1)
        done = sum(1 for m in weeks if any(m <= d <= m + timedelta(days=6) for d in done_dates))
        return done / len(weeks) if weeks else None

    weekdays = scheduled_weekdays(habit)
    scheduled = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    scheduled = [d for d in scheduled if d.weekday() in weekdays]
    if not scheduled:
        return None
    return sum(1 for d in scheduled if d in done_dates) / len(scheduled)


def tracking_start(habit: Habit, done_dates: AbstractSet[date]) -> date:
    """First day the habit counts for: its creation, or an earlier day that was caught up."""
    created = timezone.localtime(habit.created_at).date() if habit.created_at else date.min
    return min([created, *done_dates]) if done_dates else created
