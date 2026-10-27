from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone
from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from core.mixins import OwnedQuerysetMixin

from .models import Domain, Goal, Priority, Task, TaskStatus
from .rules import is_late
from .serializers import DomainSerializer, GoalSerializer, TaskSerializer, domain_ref, progress_index


class DomainViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    filter_backends: list = []


class GoalFilter(filters.FilterSet):
    root = filters.BooleanFilter(field_name="parent", lookup_expr="isnull")
    # Goals overlapping [active_from, active_to] (e.g. the year shown on the timeline).
    active_from = filters.DateFilter(field_name="end_date", lookup_expr="gte")
    active_to = filters.DateFilter(field_name="start_date", lookup_expr="lte")

    class Meta:
        model = Goal
        fields = ["domain", "horizon", "status", "parent"]


class GoalViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer
    filterset_class = GoalFilter

    @action(detail=False)
    def tree(self, request: Request) -> Response:
        """Nested goals (vision → … → monthly) with their tasks and progress."""
        index = progress_index(self.get_serializer_context())
        goals = index.goals
        domains = {d.id: d for d in Domain.objects.filter(user=request.user)}
        tasks_by_goal: dict[int, list[dict]] = {}
        for task in Task.objects.filter(user=request.user, goal__isnull=False).order_by("status", "planned_date"):
            tasks_by_goal.setdefault(task.goal_id, []).append(
                {"id": task.id, "title": task.title, "status": task.status, "priority": task.priority}
            )
        today = timezone.localdate()

        def node(goal: Goal) -> dict:
            progress = index.progress(goal.id)
            children = sorted((goals[c] for c in index.children[goal.id]), key=lambda g: (g.start_date, g.id))
            return {
                "id": goal.id,
                "title": goal.title,
                "horizon": goal.horizon,
                "status": goal.status,
                "start_date": goal.start_date,
                "end_date": goal.end_date,
                "domain": domain_ref(domains.get(goal.domain_id)) if goal.domain_id else None,
                "progress": round(progress, 4),
                "is_late": is_late(goal, progress, today),
                "children": [node(c) for c in children],
                "tasks": tasks_by_goal.get(goal.id, []),
            }

        domain_id = request.query_params.get("domain")
        roots = [g for g in goals.values() if g.parent_id is None or g.parent_id not in goals]
        if domain_id:
            # A goal is a root of the domain view when its parent lies outside the domain.
            roots = [
                g
                for g in goals.values()
                if str(g.domain_id) == domain_id
                and (g.parent_id is None or str(goals[g.parent_id].domain_id) != domain_id)
            ]
        roots.sort(key=lambda g: (-g.rank, g.start_date, g.id))
        return Response([node(g) for g in roots])


class TaskFilter(filters.FilterSet):
    domain = filters.NumberFilter(field_name="goal__domain")
    planned_after = filters.DateFilter(field_name="planned_date", lookup_expr="gte")
    planned_before = filters.DateFilter(field_name="planned_date", lookup_expr="lte")
    unplanned = filters.BooleanFilter(field_name="planned_date", lookup_expr="isnull")

    class Meta:
        model = Task
        fields = ["goal", "status", "planned_date"]


class TaskViewSet(OwnedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.select_related("goal__domain")
    serializer_class = TaskSerializer
    filterset_class = TaskFilter

    @action(detail=False)
    def today(self, request: Request) -> Response:
        """Tasks for the Today screen, grouped as overdue / today / done (today)."""
        today = timezone.localdate()
        tasks = self.get_queryset()
        open_tasks = tasks.exclude(status=TaskStatus.DONE)
        overdue = open_tasks.filter(
            Q(planned_date__lt=today) | Q(due_date__lt=today)
        ).exclude(Q(planned_date=today) | Q(due_date=today))
        due_today = open_tasks.filter(Q(planned_date=today) | Q(due_date=today))
        done = tasks.filter(status=TaskStatus.DONE, completed_at__date=today)

        context = self.get_serializer_context()

        priority_rank = Case(
            When(priority=Priority.HIGH, then=Value(0)),
            When(priority=Priority.NORMAL, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        )

        def serialize(queryset):
            ordered = queryset.order_by(priority_rank, "planned_date", "id")
            return TaskSerializer(ordered, many=True, context=context).data

        return Response({"overdue": serialize(overdue), "today": serialize(due_today), "done": serialize(done)})
