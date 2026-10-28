from datetime import date, datetime, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from goals.models import Task, TaskStatus

from .conftest import make_domain, make_goal, make_task

pytestmark = pytest.mark.django_db


def _done_on(user, day: date, goal=None):
    task = make_task(user, goal, status=TaskStatus.DONE)
    Task.objects.filter(pk=task.pk).update(
        completed_at=timezone.make_aware(datetime(day.year, day.month, day.day, 12))
    )


def test_weekly_tasks_include_empty_weeks(api, user):
    today = timezone.localdate()
    monday = today - timedelta(days=today.weekday())
    _done_on(user, monday)
    _done_on(user, monday)
    _done_on(user, monday - timedelta(weeks=2))
    _done_on(user, monday - timedelta(weeks=10))  # outside a 4-week window

    weekly = api.get("/api/stats/?weeks=4").json()["weekly_tasks"]

    assert [w["count"] for w in weekly] == [0, 1, 0, 2]
    assert weekly[-1]["week_start"] == str(monday)


def test_progress_by_domain_uses_domain_roots(api, user):
    sante = make_domain(user, "Santé")
    vision = make_goal(user, "vision", domain=sante)
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31), parent=vision, domain=sante)
    make_task(user, annual, status=TaskStatus.DONE)
    make_goal(user, "vision", title="Sans domaine")
    make_goal(user, "vision", domain=sante, status="abandoned", title="Abandonnée")

    domains = {d["name"]: d for d in api.get("/api/stats/").json()["domains"]}

    # Only the vision is a root of the domain; it inherits its child's 100 %.
    assert domains["Santé"]["progress"] == 1.0
    assert domains["Santé"]["active"] == 2
    assert domains[None]["progress"] == 0.0


def test_late_goals_and_totals(api, user):
    today = timezone.localdate()
    late = make_goal(user, "monthly", today - timedelta(days=20), today + timedelta(days=5), title="En retard")
    make_goal(user, "monthly", today - timedelta(days=1), today + timedelta(days=29), title="À l'heure")
    make_goal(user, "monthly", status="achieved", title="Atteint")
    _done_on(user, today)

    body = api.get("/api/stats/").json()

    assert [g["id"] for g in body["late_goals"]] == [late.id]
    assert body["late_goals"][0]["expected"] > body["late_goals"][0]["progress"]
    assert body["totals"]["tasks_done_30d"] == 1
    assert body["totals"]["goals_achieved"] == 1
    assert body["totals"]["habits_rate_30d"] is None


def test_stats_are_private(other_api, user):
    make_goal(user, "vision", domain=make_domain(user))
    _done_on(user, timezone.localdate())

    body = other_api.get("/api/stats/").json()

    assert body["domains"] == []
    assert sum(w["count"] for w in body["weekly_tasks"]) == 0
    assert body["totals"]["tasks_done_30d"] == 0


def test_stats_requires_auth_and_valid_weeks(api):
    assert APIClient().get("/api/stats/").status_code == 401
    assert api.get("/api/stats/?weeks=0").status_code == 400
