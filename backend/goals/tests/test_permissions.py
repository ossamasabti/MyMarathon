import pytest
from rest_framework.test import APIClient

from goals.models import Habit, Review, Task

from .conftest import make_domain, make_goal, make_task

pytestmark = pytest.mark.django_db


@pytest.fixture
def alice_data(user):
    domain = make_domain(user)
    goal = make_goal(user, "vision", domain=domain)
    task = make_task(user, goal)
    return {"domains": domain, "goals": goal, "tasks": task}


@pytest.mark.parametrize("resource", ["domains", "goals", "tasks"])
def test_anonymous_access_is_refused(resource):
    assert APIClient().get(f"/api/{resource}/").status_code == 401


@pytest.mark.parametrize("resource", ["domains", "goals", "tasks"])
def test_other_user_cannot_list_or_access(other_api, alice_data, resource):
    obj = alice_data[resource]

    assert other_api.get(f"/api/{resource}/").json() == []
    assert other_api.get(f"/api/{resource}/{obj.id}/").status_code == 404
    assert other_api.patch(f"/api/{resource}/{obj.id}/", {"title": "x", "name": "x"}).status_code == 404
    assert other_api.delete(f"/api/{resource}/{obj.id}/").status_code == 404


def test_other_user_sees_nothing_in_aggregates(other_api, alice_data):
    assert other_api.get("/api/goals/tree/").json() == []
    assert other_api.get("/api/tasks/today/").json() == {"overdue": [], "today": [], "done": []}


def test_cannot_attach_to_another_users_goal_or_domain(other_api, alice_data):
    goal, domain = alice_data["goals"], alice_data["domains"]

    as_parent = other_api.post(
        "/api/goals/",
        {"title": "x", "horizon": "annual", "start_date": "2026-01-01", "end_date": "2026-12-31", "parent": goal.id},
    )
    assert as_parent.status_code == 400
    assert "parent" in as_parent.json()

    with_domain = other_api.post(
        "/api/goals/",
        {"title": "x", "horizon": "vision", "start_date": "2026-01-01", "end_date": "2026-12-31", "domain": domain.id},
    )
    assert with_domain.status_code == 400
    assert "domain" in with_domain.json()

    task = other_api.post("/api/tasks/", {"title": "x", "goal": goal.id})
    assert task.status_code == 400
    assert "goal" in task.json()


def test_created_objects_belong_to_requester(api, user, other_user):
    response = api.post("/api/tasks/", {"title": "à moi", "user": other_user.id})

    assert response.status_code == 201
    assert user.tasks.filter(title="à moi").exists()
    assert not other_user.tasks.exists()


def test_habits_and_reviews_are_private(api, other_api, user):
    goal = make_goal(user, "vision")
    habit = Habit.objects.create(user=user, goal=goal, title="Méditer")
    review = Review.objects.create(user=user, type="weekly", period_start="2026-10-26", period_end="2026-11-01")

    assert other_api.get("/api/habits/").json() == []
    assert other_api.get("/api/habits/today/").json() == []
    assert other_api.get(f"/api/habits/{habit.id}/").status_code == 404
    assert other_api.post(f"/api/habits/{habit.id}/check/", {}, format="json").status_code == 404
    assert other_api.get(f"/api/habits/{habit.id}/logs/").status_code == 404
    assert other_api.get("/api/reviews/").json() == []
    assert other_api.get(f"/api/reviews/{review.id}/").status_code == 404
    assert other_api.patch(f"/api/reviews/{review.id}/", {"answers": {}}, format="json").status_code == 404

    stolen_goal = other_api.post("/api/habits/", {"title": "x", "goal": goal.id}, format="json")
    assert stolen_goal.status_code == 400

    # Another user may review the same period: uniqueness is per user.
    own = other_api.post("/api/reviews/", {"type": "weekly", "period_start": "2026-10-26"}, format="json")
    assert own.status_code == 201


def test_summary_only_counts_own_data(other_api, alice_data):
    Task.objects.filter(pk=alice_data["tasks"].pk).update(status="done")

    summary = other_api.get("/api/reviews/summary/?type=weekly").json()

    assert summary["tasks_done"]["count"] == 0
    assert summary["goals_advanced"] == []
