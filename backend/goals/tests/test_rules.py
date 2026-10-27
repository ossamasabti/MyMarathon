from datetime import date
from decimal import Decimal

import pytest

from goals.models import GoalStatus, Task, TaskStatus
from goals.rules import GoalShape, ProgressIndex, expected_progress, is_late, validate_goal

from .conftest import make_goal, make_task

pytestmark = pytest.mark.django_db


# --- Hierarchy validation -------------------------------------------------


def test_valid_child_has_no_errors(user):
    vision = make_goal(user, "vision")
    shape = GoalShape("annual", date(2026, 1, 1), date(2026, 12, 31))

    assert validate_goal(shape, vision) == {}


def test_end_before_start_is_rejected(user):
    shape = GoalShape("annual", date(2026, 12, 31), date(2026, 1, 1))

    assert "end_date" in validate_goal(shape, None)


@pytest.mark.parametrize("child_horizon", ["annual", "quarterly"])
def test_child_horizon_must_be_strictly_shorter(user, child_horizon):
    quarterly = make_goal(user, "quarterly", date(2026, 1, 1), date(2026, 3, 31))
    shape = GoalShape(child_horizon, date(2026, 1, 1), date(2026, 3, 31))

    assert "horizon" in validate_goal(shape, quarterly)


def test_child_dates_must_be_within_parent(user):
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31))
    too_late = GoalShape("quarterly", date(2026, 10, 1), date(2027, 1, 31))
    too_early = GoalShape("quarterly", date(2025, 12, 1), date(2026, 2, 28))

    assert set(validate_goal(too_late, annual)) == {"end_date"}
    assert set(validate_goal(too_early, annual)) == {"start_date"}


def test_parent_change_cannot_invalidate_existing_children(user):
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31))
    make_goal(user, "quarterly", date(2026, 10, 1), date(2026, 12, 31), parent=annual)

    shrunk = GoalShape("annual", date(2026, 1, 1), date(2026, 6, 30))
    assert "start_date" in validate_goal(shrunk, None, annual.children.all())

    demoted = GoalShape("quarterly", date(2026, 1, 1), date(2026, 12, 31))
    assert "horizon" in validate_goal(demoted, None, annual.children.all())


# --- Progress -------------------------------------------------------------


def index_for(user) -> ProgressIndex:
    return ProgressIndex.for_user(user)


def test_progress_uses_indicator_when_target_exists(user):
    goal = make_goal(user, "annual", target_value=Decimal("42"), current_value=Decimal("21"))
    make_task(user, goal, status=TaskStatus.TODO)  # ignored: the indicator wins

    assert index_for(user).progress(goal.id) == pytest.approx(0.5)


def test_progress_indicator_is_capped_at_one(user):
    goal = make_goal(user, "annual", target_value=Decimal("10"), current_value=Decimal("15"))

    assert index_for(user).progress(goal.id) == 1.0


def test_progress_task_ratio(user):
    goal = make_goal(user, "monthly")
    make_task(user, goal, status=TaskStatus.DONE)
    make_task(user, goal, status=TaskStatus.TODO)
    make_task(user, goal, status=TaskStatus.IN_PROGRESS)
    make_task(user, goal, status=TaskStatus.DONE)

    assert index_for(user).progress(goal.id) == pytest.approx(0.5)


def test_progress_averages_children_and_tasks(user):
    vision = make_goal(user, "vision")
    done_child = make_goal(user, "annual", parent=vision, status=GoalStatus.ACHIEVED)
    empty_child = make_goal(user, "annual", parent=vision)
    make_task(user, vision, status=TaskStatus.DONE)
    make_task(user, vision, status=TaskStatus.DONE)

    index = index_for(user)
    assert index.progress(done_child.id) == 1.0
    assert index.progress(empty_child.id) == 0.0
    # children average = 0.5, task ratio = 1.0 -> 0.75
    assert index.progress(vision.id) == pytest.approx(0.75)


def test_abandoned_children_are_ignored(user):
    vision = make_goal(user, "vision")
    make_goal(user, "annual", parent=vision, status=GoalStatus.ACHIEVED)
    make_goal(user, "annual", parent=vision, status=GoalStatus.ABANDONED)

    assert index_for(user).progress(vision.id) == 1.0


def test_progress_without_data_is_zero(user):
    goal = make_goal(user, "vision")

    assert index_for(user).progress(goal.id) == 0.0


def test_achieved_goal_is_complete(user):
    goal = make_goal(user, "monthly", status=GoalStatus.ACHIEVED)
    make_task(user, goal, status=TaskStatus.TODO)

    assert index_for(user).progress(goal.id) == 1.0


def test_progress_ignores_other_users_tasks(user, other_user):
    goal = make_goal(user, "monthly")
    make_task(user, goal, status=TaskStatus.TODO)
    Task.objects.create(user=other_user, goal=goal, title="intrus", status=TaskStatus.DONE)

    assert index_for(user).progress(goal.id) == 0.0


def test_ancestors_go_from_root_down(user):
    vision = make_goal(user, "vision")
    annual = make_goal(user, "annual", date(2026, 1, 1), date(2026, 12, 31), parent=vision)
    quarterly = make_goal(user, "quarterly", date(2026, 1, 1), date(2026, 3, 31), parent=annual)

    assert [g.id for g in index_for(user).ancestors(quarterly.id)] == [vision.id, annual.id]


# --- Lateness -------------------------------------------------------------

JAN_1, DEC_31 = date(2026, 1, 1), date(2026, 12, 31)
MID_YEAR = date(2026, 7, 2)  # ~50 % of the year elapsed


def test_expected_progress_is_bounded(user):
    goal = make_goal(user, "annual", JAN_1, DEC_31)

    assert expected_progress(goal, date(2025, 6, 1)) == 0.0
    assert expected_progress(goal, MID_YEAR) == pytest.approx(0.5, abs=0.01)
    assert expected_progress(goal, date(2027, 6, 1)) == 1.0


@pytest.mark.parametrize(
    ("progress", "late"),
    [(0.6, False), (0.45, False), (0.41, False), (0.39, True), (0.0, True)],
)
def test_late_with_ten_percent_margin(user, progress, late):
    goal = make_goal(user, "annual", JAN_1, DEC_31)

    assert is_late(goal, progress, MID_YEAR) is late


@pytest.mark.parametrize("status", [GoalStatus.PAUSED, GoalStatus.ACHIEVED, GoalStatus.ABANDONED])
def test_inactive_goal_is_never_late(user, status):
    goal = make_goal(user, "annual", JAN_1, DEC_31, status=status)

    assert is_late(goal, 0.0, date(2026, 12, 1)) is False


def test_task_completed_at_follows_status(user):
    task = make_task(user, status=TaskStatus.DONE)
    assert task.completed_at is not None

    task.status = TaskStatus.TODO
    task.save()
    assert task.completed_at is None
