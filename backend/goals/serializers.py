from django.utils import timezone
from rest_framework import serializers

from .models import Domain, Goal, Task
from .rules import GoalShape, ProgressIndex, is_late, validate_goal


def progress_index(context: dict) -> ProgressIndex:
    """Build the user's progress index once per request, after any write has happened."""
    if "_progress_index" not in context:
        context["_progress_index"] = ProgressIndex.for_user(context["request"].user)
    return context["_progress_index"]


class OwnedPrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """A FK field that only accepts objects belonging to the requesting user."""

    def get_queryset(self):
        return super().get_queryset().filter(user=self.context["request"].user)


class DomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = Domain
        fields = ["id", "name", "icon", "color", "order"]

    def validate_color(self, value: str) -> str:
        if len(value) != 7 or not value.startswith("#"):
            raise serializers.ValidationError("Couleur attendue au format #RRGGBB.")
        return value.upper()

    def validate_name(self, value: str) -> str:
        user = self.context["request"].user
        duplicates = Domain.objects.filter(user=user, name__iexact=value)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError("Un domaine porte déjà ce nom.")
        return value


def goal_ref(goal: Goal) -> dict:
    return {"id": goal.id, "title": goal.title, "horizon": goal.horizon}


def domain_ref(domain: Domain | None) -> dict | None:
    if domain is None:
        return None
    return {"id": domain.id, "name": domain.name, "color": domain.color, "icon": domain.icon}


class GoalSerializer(serializers.ModelSerializer):
    domain = OwnedPrimaryKeyRelatedField(queryset=Domain.objects.all(), allow_null=True, required=False)
    parent = OwnedPrimaryKeyRelatedField(queryset=Goal.objects.all(), allow_null=True, required=False)
    progress = serializers.SerializerMethodField()
    is_late = serializers.SerializerMethodField()
    ancestors = serializers.SerializerMethodField()
    children_count = serializers.SerializerMethodField()
    task_counts = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            "id",
            "domain",
            "parent",
            "title",
            "description",
            "horizon",
            "start_date",
            "end_date",
            "status",
            "target_value",
            "current_value",
            "unit",
            "created_at",
            "updated_at",
            "progress",
            "is_late",
            "ancestors",
            "children_count",
            "task_counts",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs: dict) -> dict:
        instance: Goal | None = self.instance

        def value(name: str):
            return attrs[name] if name in attrs else getattr(instance, name, None)

        shape = GoalShape(value("horizon"), value("start_date"), value("end_date"))
        parent = value("parent")
        if instance is not None and parent is not None and parent.pk == instance.pk:
            raise serializers.ValidationError({"parent": "Un objectif ne peut pas être son propre parent."})
        children = instance.children.all() if instance is not None else []
        errors = validate_goal(shape, parent, children)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def get_progress(self, goal: Goal) -> float:
        return round(progress_index(self.context).progress(goal.id), 4)

    def get_is_late(self, goal: Goal) -> bool:
        return is_late(goal, progress_index(self.context).progress(goal.id), timezone.localdate())

    def get_ancestors(self, goal: Goal) -> list[dict]:
        return [goal_ref(g) for g in progress_index(self.context).ancestors(goal.id)]

    def get_children_count(self, goal: Goal) -> int:
        return len(progress_index(self.context).children[goal.id])

    def get_task_counts(self, goal: Goal) -> dict:
        index = progress_index(self.context)
        return {"total": index.task_totals[goal.id], "done": index.task_done[goal.id]}


class TaskSerializer(serializers.ModelSerializer):
    goal = OwnedPrimaryKeyRelatedField(queryset=Goal.objects.all(), allow_null=True, required=False)
    goal_path = serializers.SerializerMethodField()
    domain = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "goal",
            "title",
            "notes",
            "due_date",
            "planned_date",
            "priority",
            "estimated_minutes",
            "status",
            "completed_at",
            "created_at",
            "goal_path",
            "domain",
        ]
        read_only_fields = ["completed_at", "created_at"]

    def get_goal_path(self, task: Task) -> list[dict]:
        """Why this task exists: the goal chain from the vision down to the task's goal."""
        if task.goal_id is None:
            return []
        index = progress_index(self.context)
        goal = index.goals.get(task.goal_id)
        if goal is None:
            return []
        return [goal_ref(g) for g in [*index.ancestors(goal.id), goal]]

    def get_domain(self, task: Task) -> dict | None:
        if task.goal_id is None:
            return None
        goal = progress_index(self.context).goals.get(task.goal_id)
        if goal is None or goal.domain_id is None:
            return None
        return domain_ref(goal.domain)
