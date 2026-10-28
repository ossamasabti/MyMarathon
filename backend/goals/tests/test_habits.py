from datetime import date, timedelta

import pytest
from django.utils import timezone

from goals.habits import completion, is_due, streak
from goals.models import Habit, HabitLog

from .conftest import make_goal

pytestmark = pytest.mark.django_db

# 2026-10-26 is a Monday.
MON, TUE, WED, THU, FRI, SAT, SUN = (date(2026, 10, 26) + timedelta(days=i) for i in range(7))


def habit(user, frequency="daily", days=(), **kwargs) -> Habit:
    goal = kwargs.pop("goal", None) or make_goal(user, "vision")
    return Habit.objects.create(user=user, goal=goal, title="Méditer", frequency=frequency, days=list(days))


# --- Rules ------------------------------------------------------------------


def test_daily_without_days_is_due_every_day(user):
    h = habit(user)

    assert all(is_due(h, d, set()) for d in (MON, WED, SUN))


def test_daily_with_days_is_due_on_those_days_only(user):
    h = habit(user, days=[0, 2, 4])

    assert [is_due(h, d, set()) for d in (MON, TUE, WED, SAT)] == [True, False, True, False]


def test_weekly_is_not_due_once_done_this_week(user):
    h = habit(user, "weekly", days=[1, 3])

    assert is_due(h, TUE, set())
    assert not is_due(h, THU, {TUE})
    assert is_due(h, TUE, {TUE})  # the day it was done still shows (as done)
    assert is_due(h, TUE + timedelta(weeks=1), {TUE})  # new week


def test_daily_streak_counts_scheduled_days_and_ignores_unchecked_today(user):
    h = habit(user, days=[0, 2, 4])  # Mon, Wed, Fri
    done = {MON - timedelta(weeks=1) + timedelta(days=4), MON, WED}  # previous Fri, Mon, Wed

    assert streak(h, done, FRI) == 3  # Friday not done yet: streak kept
    assert streak(h, done | {FRI}, FRI) == 4
    assert streak(h, {MON, FRI}, FRI) == 1  # Wednesday missed


def test_weekly_streak_counts_weeks(user):
    h = habit(user, "weekly", days=[5])
    done = {SAT - timedelta(weeks=2), SAT - timedelta(weeks=1)}

    assert streak(h, done, WED) == 2  # current week not done yet
    assert streak(h, done | {SAT}, SUN) == 3
    assert streak(h, {SAT - timedelta(weeks=2)}, WED) == 0


def test_completion_rate(user):
    h = habit(user, days=[0, 2, 4])

    assert completion(h, {MON, WED}, MON, SUN, SUN) == pytest.approx(2 / 3)
    assert completion(h, {MON}, MON, SUN, TUE) == 1.0  # future days excluded
    assert completion(h, set(), TUE, TUE, SUN) is None  # nothing scheduled


def test_weekly_completion_rate(user):
    h = habit(user, "weekly", days=[0])

    assert completion(h, {MON}, MON, MON + timedelta(days=13), MON + timedelta(days=13)) == 0.5


def test_goal_achieved_at_follows_status(user):
    goal = make_goal(user, "monthly", status="achieved")
    assert goal.achieved_at is not None

    goal.status = "active"
    goal.save()
    assert goal.achieved_at is None


# --- API --------------------------------------------------------------------


def test_create_habit_requires_goal_and_valid_days(api, user):
    goal = make_goal(user, "vision")

    assert "goal" in api.post("/api/habits/", {"title": "Lire"}, format="json").json()
    assert "days" in api.post(
        "/api/habits/", {"title": "Lire", "goal": goal.id, "days": [7]}, format="json"
    ).json()
    assert "days" in api.post(
        "/api/habits/", {"title": "Courir", "goal": goal.id, "frequency": "weekly", "days": []}, format="json"
    ).json()

    created = api.post("/api/habits/", {"title": "Lire", "goal": goal.id, "days": [4, 0]}, format="json")
    assert created.status_code == 201
    assert created.json()["days"] == [0, 4]
    assert created.json()["goal_path"][0]["id"] == goal.id


def test_check_is_idempotent_and_updates_streak(api, user):
    h = habit(user)

    first = api.post(f"/api/habits/{h.id}/check/", {"done": True}, format="json").json()
    api.post(f"/api/habits/{h.id}/check/", {"done": True}, format="json")
    assert HabitLog.objects.filter(habit=h).count() == 1
    assert first["done_today"] is True
    assert first["streak"] == 1

    unchecked = api.post(f"/api/habits/{h.id}/check/", {"done": False}, format="json").json()
    assert unchecked["done_today"] is False


def test_check_past_day_but_not_future(api, user):
    h = habit(user)
    today = timezone.localdate()

    past = api.post(f"/api/habits/{h.id}/check/", {"date": str(today - timedelta(days=3))}, format="json")
    assert past.status_code == 200
    future = api.post(f"/api/habits/{h.id}/check/", {"date": str(today + timedelta(days=1))}, format="json")
    assert future.status_code == 400


def test_today_lists_due_and_done_habits(api, user):
    today = timezone.localdate()
    due = habit(user, days=[today.weekday()])
    habit(user, days=[(today.weekday() + 1) % 7])  # not today
    weekly_done_earlier = habit(user, "weekly", days=[today.weekday()])
    if today.weekday() > 0:
        HabitLog.objects.create(habit=weekly_done_earlier, date=today - timedelta(days=1))

    ids = [h["id"] for h in api.get("/api/habits/today/").json()]

    assert due.id in ids
    assert (weekly_done_earlier.id in ids) is (today.weekday() == 0)


def test_logs_range(api, user):
    h = habit(user)
    for offset in range(5):
        HabitLog.objects.create(habit=h, date=MON + timedelta(days=offset))

    logs = api.get(f"/api/habits/{h.id}/logs/?from={TUE}&to={THU}").json()

    assert [entry["date"] for entry in logs] == [str(TUE), str(WED), str(THU)]


def test_completion_30d_starts_when_tracking_started(api, user):
    h = habit(user)  # created today
    today = timezone.localdate()
    api.post(f"/api/habits/{h.id}/check/", {"date": str(today - timedelta(days=1))}, format="json")

    body = api.post(f"/api/habits/{h.id}/check/", {"done": True}, format="json").json()

    # Yesterday (caught up) and today, both done: 100 %, not 2/30.
    assert body["completion_30d"] == 1.0
