from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from goals.models import Domain, Goal, Habit, Task
from goals.rules import GoalShape, validate_goal
from goals.templates import add_months, build_phd_plan, plan_counts

from .conftest import make_domain

URL = "/api/templates/phd/"
BODY = {"start_date": "2026-11-01", "years": 3, "thesis_title": "Optimisation multiobjectif et SVM"}


def test_add_months_clamps_to_month_end():
    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
    assert add_months(date(2026, 11, 30), 3) == date(2027, 2, 28)
    assert add_months(date(2026, 12, 15), 12) == date(2027, 12, 15)


@pytest.mark.parametrize("years", [3, 4])
@pytest.mark.parametrize("start", [date(2026, 11, 1), date(2026, 1, 31), date(2027, 8, 29)])
def test_every_child_fits_in_its_parent(years, start):
    root = build_phd_plan(start, years, "Thèse")
    assert root.start_date == start
    assert root.end_date == add_months(start, 12 * years) - timedelta(days=1)

    def check(parent):
        previous_end = None
        for child in parent.children:
            assert not validate_goal(GoalShape(child.horizon, child.start_date, child.end_date), _as_goal(parent))
            if previous_end is not None:
                assert (child.start_date - previous_end).days == 1  # consecutive, no gap or overlap
            previous_end = child.end_date
            for task in child.tasks:
                assert child.start_date <= task.due_date <= child.end_date
            check(child)

    check(root)
    assert len(root.children) == years
    assert root.children[-1].end_date == root.end_date


def _as_goal(planned) -> Goal:
    return Goal(title=planned.title, horizon=planned.horizon, start_date=planned.start_date, end_date=planned.end_date)


def test_counts_depend_on_duration():
    assert plan_counts(build_phd_plan(date(2026, 11, 1), 3, "T")) == {"goals": 19, "tasks": 7, "habits": 3}
    assert plan_counts(build_phd_plan(date(2026, 11, 1), 4, "T"))["goals"] == 24


@pytest.mark.django_db
def test_preview_writes_nothing(api, user):
    response = api.get(URL, BODY)
    assert response.status_code == 200
    body = response.json()
    assert body["plan"]["title"] == BODY["thesis_title"]
    assert body["plan"]["end_date"] == "2029-10-31"
    assert body["counts"]["goals"] == 19
    assert not Goal.objects.exists() and not Domain.objects.exists()


@pytest.mark.django_db
def test_create_builds_the_whole_tree_for_the_user(api, user):
    response = api.post(URL, BODY, format="json")
    assert response.status_code == 201
    body = response.json()

    domain = Domain.objects.get(id=body["domain_id"], user=user)
    assert domain.name == "Doctorat"
    vision = Goal.objects.get(id=body["vision_id"], user=user, parent=None, horizon="vision")
    assert Goal.objects.filter(user=user, domain=domain).count() == 19
    assert Task.objects.filter(user=user, goal__domain=domain).count() == 7
    assert Habit.objects.filter(user=user, goal__domain=domain).count() == 3
    assert vision.children.count() == 3

    literature = Goal.objects.get(user=user, title="T1 : Revue de littérature")
    assert literature.target_value == 60 and literature.current_value == 0 and literature.unit == "articles"

    tree = api.get("/api/goals/tree/").json()
    assert tree[0]["id"] == vision.id and tree[0]["progress"] == 0.0


@pytest.mark.django_db
def test_duplicate_domain_name_creates_nothing(api, user):
    make_domain(user, "Doctorat")
    response = api.post(URL, {**BODY, "domain_name": "doctorat"}, format="json")
    assert response.status_code == 400
    assert "domain_name" in response.json()
    assert not Goal.objects.exists() and not Habit.objects.exists() and Domain.objects.count() == 1

    custom = api.post(URL, {**BODY, "domain_name": "Thèse"}, format="json")
    assert custom.status_code == 201


@pytest.mark.django_db
def test_invalid_parameters_are_rejected(api):
    assert api.get(URL, {**BODY, "years": 5}).status_code == 400
    assert api.get(URL, {**BODY, "start_date": "pas une date"}).status_code == 400
    assert api.get(URL, {"start_date": "2026-11-01"}).status_code == 400


@pytest.mark.django_db
def test_anonymous_is_refused():
    assert APIClient().get(URL, BODY).status_code == 401
    assert APIClient().post(URL, BODY, format="json").status_code == 401
