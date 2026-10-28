from datetime import date, timedelta

import pytest
from django.utils import timezone

from goals.models import FocusSession

from .conftest import make_task

pytestmark = pytest.mark.django_db


# --- Task time slot -----------------------------------------------------------


def test_task_time_slot_round_trip(api, user):
    task = make_task(user, planned_date=date(2026, 3, 2))
    response = api.patch(f"/api/tasks/{task.id}/", {"start_time": "09:00", "end_time": "10:30"})
    assert response.status_code == 200
    assert response.json()["start_time"] == "09:00:00"
    assert response.json()["end_time"] == "10:30:00"


def test_end_time_must_follow_start_time(api, user):
    task = make_task(user, planned_date=date(2026, 3, 2))
    response = api.patch(f"/api/tasks/{task.id}/", {"start_time": "10:00", "end_time": "09:00"})
    assert response.status_code == 400
    assert response.json()["end_time"] == ["L'heure de fin doit être après l'heure de début."]


def test_end_time_requires_start_time(api, user):
    task = make_task(user, planned_date=date(2026, 3, 2))
    response = api.patch(f"/api/tasks/{task.id}/", {"end_time": "09:00"})
    assert response.status_code == 400
    assert "end_time" in response.json()


def test_time_slot_requires_a_planned_day(api, user):
    task = make_task(user)
    response = api.patch(f"/api/tasks/{task.id}/", {"start_time": "09:00"})
    assert response.status_code == 400
    assert response.json()["start_time"] == ["Planifie d'abord un jour pour cette tâche."]


def test_unplanning_a_task_clears_its_time_slot(api, user):
    task = make_task(user, planned_date=date(2026, 3, 2), start_time="09:00", end_time="10:00")
    response = api.patch(f"/api/tasks/{task.id}/", {"planned_date": None}, format="json")
    assert response.status_code == 200
    assert response.json()["start_time"] is None
    assert response.json()["end_time"] is None


def test_today_lists_timed_tasks_first_in_time_order(api, user):
    today = timezone.localdate()
    untimed = make_task(user, title="Sans heure", planned_date=today, priority="high")
    late = make_task(user, title="14 h", planned_date=today, start_time="14:00")
    early = make_task(user, title="8 h", planned_date=today, start_time="08:00")
    ids = [t["id"] for t in api.get("/api/tasks/today/").json()["today"]]
    assert ids == [early.id, late.id, untimed.id]


# --- Focus sessions -----------------------------------------------------------


def session_payload(**overrides) -> dict:
    ended = timezone.now().replace(microsecond=0)
    payload = {
        "mode": "stopwatch",
        "started_at": (ended - timedelta(minutes=30)).isoformat(),
        "ended_at": ended.isoformat(),
        "duration_seconds": 25 * 60,
    }
    payload.update(overrides)
    return payload


def test_create_session_and_task_time_spent(api, user):
    task = make_task(user)
    response = api.post("/api/focus-sessions/", session_payload(task=task.id), format="json")
    assert response.status_code == 201
    assert response.json()["task_title"] == "Tâche"
    api.post("/api/focus-sessions/", session_payload(task=task.id, duration_seconds=300), format="json")

    assert api.get(f"/api/tasks/{task.id}/").json()["time_spent_seconds"] == 25 * 60 + 300
    listed = api.get(f"/api/focus-sessions/?task={task.id}").json()
    assert len(listed) == 2


def test_session_without_task_is_allowed(api):
    response = api.post("/api/focus-sessions/", session_payload(), format="json")
    assert response.status_code == 201
    assert response.json()["task"] is None


def test_timer_requires_planned_minutes(api):
    response = api.post("/api/focus-sessions/", session_payload(mode="timer"), format="json")
    assert response.status_code == 400
    assert "planned_minutes" in response.json()
    ok = api.post("/api/focus-sessions/", session_payload(mode="timer", planned_minutes=25), format="json")
    assert ok.status_code == 201


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"duration_seconds": 31 * 60}, "duration_seconds"),
        ({"duration_seconds": 0}, "duration_seconds"),
        ({"ended_at": (timezone.now() - timedelta(hours=2)).isoformat()}, "ended_at"),
    ],
)
def test_invalid_sessions_are_rejected(api, overrides, field):
    response = api.post("/api/focus-sessions/", session_payload(**overrides), format="json")
    assert response.status_code == 400
    assert field in response.json()


def test_session_in_the_future_is_rejected(api):
    started = timezone.now() + timedelta(hours=1)
    payload = session_payload(
        started_at=started.isoformat(), ended_at=(started + timedelta(minutes=30)).isoformat()
    )
    response = api.post("/api/focus-sessions/", payload, format="json")
    assert response.status_code == 400
    assert "ended_at" in response.json()


def test_deleting_task_keeps_its_sessions(api, user):
    task = make_task(user)
    session_id = api.post("/api/focus-sessions/", session_payload(task=task.id), format="json").json()["id"]
    api.delete(f"/api/tasks/{task.id}/")
    assert FocusSession.objects.get(pk=session_id).task is None


def test_sessions_are_isolated_between_users(api, other_api, user, other_user):
    other_task = make_task(other_user)
    response = api.post("/api/focus-sessions/", session_payload(task=other_task.id), format="json")
    assert response.status_code == 400
    assert "task" in response.json()

    session_id = other_api.post("/api/focus-sessions/", session_payload(), format="json").json()["id"]
    assert api.get("/api/focus-sessions/").json() == []
    assert api.get(f"/api/focus-sessions/{session_id}/").status_code == 404


def test_stats_total_focus_time(api, user):
    api.post("/api/focus-sessions/", session_payload(duration_seconds=600), format="json")
    old_end = timezone.now() - timedelta(days=40)
    FocusSession.objects.create(
        user=user, mode="stopwatch", started_at=old_end - timedelta(hours=1), ended_at=old_end, duration_seconds=3600
    )
    assert api.get("/api/stats/").json()["totals"]["focus_seconds_30d"] == 600


def test_session_progress_is_saved_minute_by_minute(api, user):
    """The app creates the session after the first minute, then updates it: the task total follows."""
    task = make_task(user)
    started = timezone.now().replace(microsecond=0) - timedelta(minutes=3)
    created = api.post(
        "/api/focus-sessions/",
        {"task": task.id, "mode": "stopwatch", "started_at": started.isoformat(),
         "ended_at": (started + timedelta(minutes=1)).isoformat(), "duration_seconds": 60},
        format="json",
    ).json()
    assert api.get(f"/api/tasks/{task.id}/").json()["time_spent_seconds"] == 60

    updated = api.patch(
        f"/api/focus-sessions/{created['id']}/",
        {"ended_at": (started + timedelta(minutes=2)).isoformat(), "duration_seconds": 120},
        format="json",
    )
    assert updated.status_code == 200
    assert api.get(f"/api/tasks/{task.id}/").json()["time_spent_seconds"] == 120

    # A later update still respects the elapsed time.
    too_long = api.patch(f"/api/focus-sessions/{created['id']}/", {"duration_seconds": 600}, format="json")
    assert too_long.status_code == 400
