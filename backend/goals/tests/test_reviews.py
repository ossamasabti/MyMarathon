from datetime import date, datetime, timedelta

import pytest
from django.utils import timezone

from goals.models import Goal, Habit, HabitLog, Task, TaskStatus
from goals.periods import period_bounds

from .conftest import make_goal, make_task

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("review_type", "day", "expected"),
    [
        ("weekly", date(2026, 10, 28), (date(2026, 10, 26), date(2026, 11, 1))),
        ("monthly", date(2026, 2, 14), (date(2026, 2, 1), date(2026, 2, 28))),
        ("quarterly", date(2026, 11, 5), (date(2026, 10, 1), date(2026, 12, 31))),
        ("quarterly", date(2026, 1, 1), (date(2026, 1, 1), date(2026, 3, 31))),
    ],
)
def test_period_bounds(review_type, day, expected):
    assert period_bounds(review_type, day) == expected


def test_create_review_sets_period_end(api):
    response = api.post(
        "/api/reviews/",
        {"type": "weekly", "period_start": "2026-10-26", "answers": {"advanced": "Deux sorties"}},
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["period_end"] == "2026-11-01"


def test_review_period_must_match_type(api):
    response = api.post("/api/reviews/", {"type": "weekly", "period_start": "2026-10-27"}, format="json")

    assert response.status_code == 400
    assert "26/10/2026" in response.json()["period_start"][0]


def test_one_review_per_period_but_editable(api):
    body = {"type": "monthly", "period_start": "2026-10-01", "answers": {}}
    review = api.post("/api/reviews/", body, format="json").json()

    assert api.post("/api/reviews/", body, format="json").status_code == 400
    updated = api.patch(f"/api/reviews/{review['id']}/", {"answers": {"blocked": "Fatigue"}}, format="json")
    assert updated.status_code == 200
    assert updated.json()["answers"] == {"blocked": "Fatigue"}


def test_answers_must_be_text(api):
    response = api.post(
        "/api/reviews/", {"type": "weekly", "period_start": "2026-10-26", "answers": {"x": 3}}, format="json"
    )

    assert response.status_code == 400


def test_review_filters(api):
    api.post("/api/reviews/", {"type": "weekly", "period_start": "2026-10-26"}, format="json")
    api.post("/api/reviews/", {"type": "monthly", "period_start": "2026-10-01"}, format="json")

    assert len(api.get("/api/reviews/?type=weekly&period_start=2026-10-26").json()) == 1


def _at(day: date) -> datetime:
    return timezone.make_aware(datetime(day.year, day.month, day.day, 12))


def test_summary_of_a_week(api, user):
    week_start = date(2026, 10, 26)
    vision = make_goal(user, "vision", title="Vision")
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31), parent=vision, title="Annuel")
    in_week = make_task(user, annual, title="Faite cette semaine", status=TaskStatus.DONE)
    before = make_task(user, annual, title="Faite avant", status=TaskStatus.DONE)
    Task.objects.filter(pk=in_week.pk).update(completed_at=_at(week_start + timedelta(days=2)))
    Task.objects.filter(pk=before.pk).update(completed_at=_at(week_start - timedelta(days=3)))
    achieved = make_goal(user, "monthly", date(2026, 10, 1), date(2026, 10, 31), parent=annual, status="achieved")
    Goal.objects.filter(pk=achieved.pk).update(achieved_at=_at(week_start + timedelta(days=1)))
    habit = Habit.objects.create(user=user, goal=vision, title="Courir", days=[0, 2, 4])
    HabitLog.objects.create(habit=habit, date=week_start)

    summary = api.get("/api/reviews/summary/?type=weekly&period_start=2026-10-28").json()

    assert summary["period_start"] == "2026-10-26"
    assert summary["tasks_done"]["count"] == 1
    assert summary["tasks_done"]["items"][0]["title"] == "Faite cette semaine"
    advanced = {g["title"]: g["tasks_done"] for g in summary["goals_advanced"]}
    assert advanced == {"Annuel": 1, "Vision": 1}  # the vision advanced through its child
    assert [g["id"] for g in summary["goals_achieved"]] == [achieved.id]
    assert summary["habits"][0]["title"] == "Courir"
    assert 0 < summary["habits"][0]["rate"] <= 1


def test_summary_requires_a_valid_type(api):
    assert api.get("/api/reviews/summary/?type=yearly").status_code == 400
