"""Business rules for goals: hierarchy validation, progress and lateness.

Kept free of DRF so they can be tested directly.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Iterable

from .models import HORIZON_RANK, Goal, GoalStatus, Task, TaskStatus

LATE_MARGIN = 0.10


@dataclass(frozen=True)
class GoalShape:
    """The fields that hierarchy validation depends on."""

    horizon: str
    start_date: date
    end_date: date


def validate_goal(shape: GoalShape, parent: Goal | None, children: Iterable[Goal] = ()) -> dict[str, str]:
    """Return field -> error message; empty when valid."""
    errors: dict[str, str] = {}
    if shape.start_date > shape.end_date:
        errors["end_date"] = "La date de fin doit être postérieure à la date de début."
        return errors

    rank = HORIZON_RANK[shape.horizon]
    if parent is not None:
        if rank >= HORIZON_RANK[parent.horizon]:
            errors["horizon"] = (
                f"L'horizon doit être plus court que celui de l'objectif parent ({parent.get_horizon_display()})."
            )
        parent_range = f"(du {parent.start_date:%d/%m/%Y} au {parent.end_date:%d/%m/%Y})"
        if shape.start_date < parent.start_date:
            errors["start_date"] = f"Les dates doivent être comprises dans celles de l'objectif parent {parent_range}."
        if shape.end_date > parent.end_date:
            errors["end_date"] = f"Les dates doivent être comprises dans celles de l'objectif parent {parent_range}."

    for child in children:
        if HORIZON_RANK[child.horizon] >= rank:
            errors["horizon"] = f"Le sous-objectif « {child.title} » a un horizon trop long pour ce changement."
            break
        if child.start_date < shape.start_date or child.end_date > shape.end_date:
            errors["start_date"] = f"Le sous-objectif « {child.title} » sortirait des nouvelles dates."
            break
    return errors


@dataclass
class ProgressIndex:
    """Progress of every goal of a user, computed in memory from two queries."""

    goals: dict[int, Goal]
    children: dict[int, list[int]] = field(default_factory=lambda: defaultdict(list))
    task_totals: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    task_done: dict[int, int] = field(default_factory=lambda: defaultdict(int))
    _cache: dict[int, float] = field(default_factory=dict)

    @classmethod
    def for_user(cls, user) -> "ProgressIndex":
        goals = Goal.objects.filter(user=user).select_related("domain")
        tasks = Task.objects.filter(user=user, goal__isnull=False).values_list("goal_id", "status")
        return cls.build(goals, tasks)

    @classmethod
    def build(cls, goals: Iterable[Goal], tasks: Iterable[tuple[int, str]]) -> "ProgressIndex":
        index = cls(goals={g.id: g for g in goals})
        for goal in index.goals.values():
            if goal.parent_id in index.goals:
                index.children[goal.parent_id].append(goal.id)
        for goal_id, status in tasks:
            index.task_totals[goal_id] += 1
            if status == TaskStatus.DONE:
                index.task_done[goal_id] += 1
        return index

    def progress(self, goal_id: int) -> float:
        if goal_id not in self._cache:
            self._cache[goal_id] = self._compute(goal_id)
        return self._cache[goal_id]

    def _compute(self, goal_id: int) -> float:
        goal = self.goals[goal_id]
        if goal.status == GoalStatus.ACHIEVED:
            return 1.0
        if goal.target_value is not None and goal.target_value > 0:
            current = goal.current_value or Decimal(0)
            return max(0.0, min(1.0, float(current / goal.target_value)))

        parts: list[float] = []
        children = [c for c in self.children[goal_id] if self.goals[c].status != GoalStatus.ABANDONED]
        if children:
            parts.append(sum(self.progress(c) for c in children) / len(children))
        total = self.task_totals[goal_id]
        if total:
            parts.append(self.task_done[goal_id] / total)
        return sum(parts) / len(parts) if parts else 0.0

    def ancestors(self, goal_id: int) -> list[Goal]:
        """From the root down to (excluding) the goal itself."""
        chain: list[Goal] = []
        parent_id = self.goals[goal_id].parent_id
        while parent_id is not None and parent_id in self.goals and len(chain) < len(HORIZON_RANK):
            parent = self.goals[parent_id]
            chain.append(parent)
            parent_id = parent.parent_id
        return list(reversed(chain))


def expected_progress(goal: Goal, today: date) -> float:
    duration = (goal.end_date - goal.start_date).days
    if duration <= 0:
        return 1.0 if today >= goal.end_date else 0.0
    elapsed = (today - goal.start_date).days
    return max(0.0, min(1.0, elapsed / duration))


def is_late(goal: Goal, progress: float, today: date) -> bool:
    """Late when progress trails the elapsed share of the period by more than the margin."""
    if goal.status != GoalStatus.ACTIVE:
        return False
    return progress < expected_progress(goal, today) - LATE_MARGIN
