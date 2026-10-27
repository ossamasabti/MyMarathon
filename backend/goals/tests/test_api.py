from datetime import date, timedelta

import pytest
from django.utils import timezone

from goals.models import Goal, Task, TaskStatus

from .conftest import make_domain, make_goal, make_task

pytestmark = pytest.mark.django_db


def test_create_domain_and_reject_duplicate_name(api):
    response = api.post("/api/domains/", {"name": "Santé", "color": "#1e7a3e", "icon": "heart-outline"})
    assert response.status_code == 201
    assert response.json()["color"] == "#1E7A3E"

    duplicate = api.post("/api/domains/", {"name": "santé", "color": "#1E7A3E"})
    assert duplicate.status_code == 400
    assert "name" in duplicate.json()


def test_create_goal_hierarchy_and_read_progress(api, user):
    domain = make_domain(user)
    vision = api.post(
        "/api/goals/",
        {"title": "Courir un marathon", "horizon": "vision", "start_date": "2026-01-01",
         "end_date": "2029-12-31", "domain": domain.id},
    ).json()
    annual = api.post(
        "/api/goals/",
        {"title": "Semi en 2026", "horizon": "annual", "start_date": "2026-01-01",
         "end_date": "2026-12-31", "parent": vision["id"]},
    )
    assert annual.status_code == 201
    body = annual.json()
    assert body["ancestors"] == [{"id": vision["id"], "title": "Courir un marathon", "horizon": "vision"}]
    assert body["progress"] == 0.0
    assert body["task_counts"] == {"total": 0, "done": 0}

    detail = api.get(f"/api/goals/{vision['id']}/").json()
    assert detail["children_count"] == 1


def test_goal_validation_errors_are_returned_in_french(api, user):
    vision = make_goal(user, "vision", date(2026, 1, 1), date(2026, 12, 31))

    response = api.post(
        "/api/goals/",
        {"title": "Trop long", "horizon": "annual", "start_date": "2026-06-01",
         "end_date": "2027-06-01", "parent": vision.id},
    )

    assert response.status_code == 400
    assert "comprises dans celles de l'objectif parent" in response.json()["end_date"][0]


def test_goal_cannot_be_its_own_parent(api, user):
    goal = make_goal(user, "vision")

    response = api.patch(f"/api/goals/{goal.id}/", {"parent": goal.id})

    assert response.status_code == 400


def test_updating_parent_dates_checks_children(api, user):
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31))
    make_goal(user, "quarterly", date(2026, 10, 1), date(2026, 12, 31), parent=annual)

    response = api.patch(f"/api/goals/{annual.id}/", {"end_date": "2026-06-30"})

    assert response.status_code == 400


def test_goal_filters(api, user):
    vision = make_goal(user, "vision")
    make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31), parent=vision)

    assert len(api.get("/api/goals/?root=true").json()) == 1
    assert len(api.get("/api/goals/?horizon=annual").json()) == 1
    assert len(api.get(f"/api/goals/?parent={vision.id}").json()) == 1


def test_progress_reflects_status_change_in_response(api, user):
    goal = make_goal(user, "monthly")

    response = api.patch(f"/api/goals/{goal.id}/", {"status": "achieved"})

    assert response.json()["progress"] == 1.0


def test_task_lifecycle_and_goal_path(api, user):
    vision = make_goal(user, "vision", title="Vision")
    monthly = make_goal(user, "monthly", date(2026, 1, 1), date(2026, 1, 31), parent=vision, title="Janvier")

    created = api.post("/api/tasks/", {"title": "Courir 5 km", "goal": monthly.id})
    assert created.status_code == 201
    task = created.json()
    assert [step["title"] for step in task["goal_path"]] == ["Vision", "Janvier"]
    assert task["completed_at"] is None

    done = api.patch(f"/api/tasks/{task['id']}/", {"status": "done"}).json()
    assert done["completed_at"] is not None
    assert api.get(f"/api/goals/{monthly.id}/").json()["progress"] == 1.0

    reopened = api.patch(f"/api/tasks/{task['id']}/", {"status": "todo"}).json()
    assert reopened["completed_at"] is None


def test_task_without_goal_is_allowed(api):
    response = api.post("/api/tasks/", {"title": "Appeler le kiné"})

    assert response.status_code == 201
    assert response.json()["goal_path"] == []


def test_today_groups_tasks(api, user):
    today = timezone.localdate()
    make_task(user, title="aujourd'hui", planned_date=today, priority="low")
    make_task(user, title="urgent", planned_date=today, priority="high")
    make_task(user, title="en retard", planned_date=today - timedelta(days=2))
    make_task(user, title="échue", due_date=today - timedelta(days=1))
    make_task(user, title="demain", planned_date=today + timedelta(days=1))
    make_task(user, title="faite", planned_date=today, status=TaskStatus.DONE)
    old = make_task(user, title="faite avant", planned_date=today - timedelta(days=3), status=TaskStatus.DONE)
    Task.objects.filter(pk=old.pk).update(completed_at=timezone.now() - timedelta(days=3))

    body = api.get("/api/tasks/today/").json()

    assert [t["title"] for t in body["today"]] == ["urgent", "aujourd'hui"]
    assert sorted(t["title"] for t in body["overdue"]) == ["en retard", "échue"]
    assert [t["title"] for t in body["done"]] == ["faite"]


def test_tree_nests_goals_and_tasks(api, user):
    domain = make_domain(user)
    vision = make_goal(user, "vision", domain=domain)
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31), parent=vision, domain=domain)
    make_task(user, annual, title="Plan", status=TaskStatus.DONE)
    make_goal(user, "vision", title="Autre vision")

    tree = api.get("/api/goals/tree/").json()
    assert len(tree) == 2
    root = next(n for n in tree if n["id"] == vision.id)
    assert root["domain"]["name"] == "Santé"
    assert root["children"][0]["id"] == annual.id
    assert root["children"][0]["tasks"][0]["title"] == "Plan"
    assert root["children"][0]["progress"] == 1.0

    filtered = api.get(f"/api/goals/tree/?domain={domain.id}").json()
    assert [n["id"] for n in filtered] == [vision.id]


def test_tasks_filter_by_domain(api, user):
    domain = make_domain(user)
    goal = make_goal(user, "vision", domain=domain)
    make_task(user, goal)
    make_task(user)

    assert len(api.get(f"/api/tasks/?domain={domain.id}").json()) == 1


def test_deleting_parent_keeps_children_as_roots(api, user):
    vision = make_goal(user, "vision")
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31), parent=vision)

    assert api.delete(f"/api/goals/{vision.id}/").status_code == 204
    assert Goal.objects.get(pk=annual.pk).parent is None
