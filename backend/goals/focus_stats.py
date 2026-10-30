"""Focus overview: daily goal, streaks, records, charts and badges.

Days and hours are counted in the user's time zone (sent by the app), not the server's.
"""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta, tzinfo

from .models import FocusMode, FocusSession

HEATMAP_WEEKS = 12
RECENT_DAYS = 30
# A session started between these hours (local time) unlocks "early bird".
EARLY_BIRD_HOURS = range(4, 8)
DEEP_WORK_MINUTES = 90


@dataclass
class _Session:
    start: datetime
    end: datetime
    seconds: int
    completed_timer: bool
    quality: int | None
    domain_id: int | None


def spread_by_hour(start: datetime, end: datetime, seconds: float, tz: tzinfo) -> list[tuple[datetime, float]]:
    """Share a session's focused seconds between the local clock hours it covers, pro rata."""
    start, end = start.astimezone(tz), end.astimezone(tz)
    span = (end - start).total_seconds()
    if span <= 0:
        return [(start.replace(minute=0, second=0, microsecond=0), float(seconds))]
    parts = []
    cursor = start
    while cursor < end:
        hour = cursor.replace(minute=0, second=0, microsecond=0)
        upper = min(hour + timedelta(hours=1), end)
        parts.append((hour, seconds * (upper - cursor).total_seconds() / span))
        cursor = upper
    return parts


def _streaks(daily: dict[date, float], goal_seconds: int, today: date) -> tuple[int, int]:
    """(current, best) runs of days reaching the goal. Today not reached yet does not break the run."""
    reached = {day for day, seconds in daily.items() if seconds >= goal_seconds}
    current = 0
    day = today
    while day in reached or (day == today and current == 0):
        if day in reached:
            current += 1
        day -= timedelta(days=1)
    best = run = 0
    previous = None
    for day in sorted(reached):
        run = run + 1 if previous is not None and day - previous == timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return current, max(best, current)


def _badge(key: str, progress: float, target: int) -> dict:
    return {"key": key, "unlocked": progress >= target, "progress": min(int(progress), target), "target": target}


def build_focus_overview(user, tz: tzinfo, now: datetime) -> dict:
    sessions = [
        _Session(
            start=row["started_at"],
            end=row["ended_at"],
            seconds=row["duration_seconds"],
            completed_timer=row["mode"] == FocusMode.TIMER
            and row["duration_seconds"] >= (row["planned_minutes"] or 0) * 60,
            quality=row["quality"],
            domain_id=row["task__goal__domain_id"],
        )
        for row in FocusSession.objects.filter(user=user).values(
            "started_at",
            "ended_at",
            "duration_seconds",
            "mode",
            "planned_minutes",
            "quality",
            "task__goal__domain_id",
        )
    ]
    today = now.astimezone(tz).date()
    recent_start = today - timedelta(days=RECENT_DAYS - 1)

    daily: dict[date, float] = defaultdict(float)
    by_hour = [0.0] * 24
    by_domain: dict[int | None, float] = defaultdict(float)
    for session in sessions:
        for hour, seconds in spread_by_hour(session.start, session.end, session.seconds, tz):
            daily[hour.date()] += seconds
            if recent_start <= hour.date() <= today:
                by_hour[hour.hour] += seconds
                by_domain[session.domain_id] += seconds

    goal_seconds = user.focus_goal_minutes * 60
    streak, best_streak = _streaks(daily, goal_seconds, today)
    total = sum(s.seconds for s in sessions)
    best_day = max(daily.items(), key=lambda item: item[1], default=None)
    longest = max((s.seconds for s in sessions), default=0)
    recent_qualities = [
        s.quality for s in sessions if s.quality is not None and s.start.astimezone(tz).date() >= recent_start
    ]

    heatmap_start = today - timedelta(days=today.weekday(), weeks=HEATMAP_WEEKS - 1)
    heatmap = [
        {"date": day.isoformat(), "seconds": round(daily.get(day, 0))}
        for day in (heatmap_start + timedelta(days=n) for n in range((today - heatmap_start).days + 1))
    ]

    domains = {d.id: d for d in user.domains.all()}
    by_domain_out = sorted(
        (
            {
                "domain": (
                    {"id": d.id, "name": d.name, "color": d.color, "icon": d.icon}
                    if (d := domains.get(domain_id)) is not None
                    else None
                ),
                "seconds": round(seconds),
            }
            for domain_id, seconds in by_domain.items()
            if round(seconds) > 0
        ),
        key=lambda row: -row["seconds"],
    )

    hours_total = total / 3600
    timers = sum(1 for s in sessions if s.completed_timer)
    top_rated = sum(1 for s in sessions if s.quality == 5)
    early = any(s.start.astimezone(tz).hour in EARLY_BIRD_HOURS for s in sessions)
    badges = [
        _badge("first_session", len(sessions), 1),
        _badge("hours_1", hours_total, 1),
        _badge("hours_10", hours_total, 10),
        _badge("hours_50", hours_total, 50),
        _badge("hours_100", hours_total, 100),
        _badge("streak_3", best_streak, 3),
        _badge("streak_7", best_streak, 7),
        _badge("streak_30", best_streak, 30),
        _badge("streak_100", best_streak, 100),
        _badge("timers_10", timers, 10),
        _badge("timers_50", timers, 50),
        _badge("deep_work", longest / 60, DEEP_WORK_MINUTES),
        _badge("top_quality_10", top_rated, 10),
        _badge("early_bird", 1 if early else 0, 1),
    ]

    return {
        "today": today.isoformat(),
        "today_seconds": round(daily.get(today, 0)),
        "goal_minutes": user.focus_goal_minutes,
        "streak": streak,
        "best_streak": best_streak,
        "records": {
            "best_day": {"date": best_day[0].isoformat(), "seconds": round(best_day[1])} if best_day else None,
            "longest_session_seconds": longest,
            "total_seconds": total,
            "sessions": len(sessions),
        },
        "heatmap": heatmap,
        "by_hour": [round(seconds) for seconds in by_hour],
        "by_domain": by_domain_out,
        "quality_avg_30d": round(sum(recent_qualities) / len(recent_qualities), 2) if recent_qualities else None,
        "badges": badges,
    }
