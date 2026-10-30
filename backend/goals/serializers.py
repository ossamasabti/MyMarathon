from collections import defaultdict
from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from . import habits as habits_rules
from .models import Domain, FocusMode, FocusSession, Frequency, Goal, Habit, HabitLog, Review, Task
from .periods import period_bounds
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


def focus_totals(context: dict) -> dict[int, int]:
    """Focused seconds per task of the user, loaded once per request after any write."""
    if "_focus_totals" not in context:
        rows = (
            FocusSession.objects.filter(user=context["request"].user, task__isnull=False)
            .values("task_id")
            .annotate(total=Sum("duration_seconds"))
        )
        context["_focus_totals"] = {row["task_id"]: row["total"] for row in rows}
    return context["_focus_totals"]


def final_value(serializer: serializers.Serializer, attrs: dict, field: str):
    """Value a field will have after this write (partial updates fall back to the instance)."""
    if field in attrs:
        return attrs[field]
    return getattr(serializer.instance, field, None)


class TaskSerializer(serializers.ModelSerializer):
    goal = OwnedPrimaryKeyRelatedField(queryset=Goal.objects.all(), allow_null=True, required=False)
    goal_path = serializers.SerializerMethodField()
    domain = serializers.SerializerMethodField()
    time_spent_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "goal",
            "title",
            "notes",
            "due_date",
            "planned_date",
            "start_time",
            "end_time",
            "priority",
            "estimated_minutes",
            "status",
            "completed_at",
            "created_at",
            "goal_path",
            "domain",
            "time_spent_seconds",
        ]
        read_only_fields = ["completed_at", "created_at"]

    def validate(self, attrs: dict) -> dict:
        start = final_value(self, attrs, "start_time")
        end = final_value(self, attrs, "end_time")
        if end is not None and start is None:
            raise serializers.ValidationError({"end_time": "Indique aussi l'heure de début."})
        if start is not None and end is not None and end <= start:
            raise serializers.ValidationError({"end_time": "L'heure de fin doit être après l'heure de début."})
        # Unplanning a task clears its slot (Task.save); setting a slot needs a planned day.
        setting_slot = attrs.get("start_time") is not None or attrs.get("end_time") is not None
        if setting_slot and final_value(self, attrs, "planned_date") is None:
            raise serializers.ValidationError({"start_time": "Planifie d'abord un jour pour cette tâche."})
        return attrs

    def get_time_spent_seconds(self, task: Task) -> int:
        return focus_totals(self.context).get(task.id, 0)

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


# --- Habits -----------------------------------------------------------------

HABIT_HISTORY_DAYS = 400


def habit_done_dates(context: dict) -> dict[int, set]:
    """Done dates of the user's habits (recent history), loaded once per request after any write."""
    if "_habit_done_dates" not in context:
        since = timezone.localdate() - timedelta(days=HABIT_HISTORY_DAYS)
        done: dict[int, set] = defaultdict(set)
        logs = HabitLog.objects.filter(habit__user=context["request"].user, done=True, date__gte=since)
        for habit_id, day in logs.values_list("habit_id", "date"):
            done[habit_id].add(day)
        context["_habit_done_dates"] = done
    return context["_habit_done_dates"]


class HabitSerializer(serializers.ModelSerializer):
    goal = OwnedPrimaryKeyRelatedField(queryset=Goal.objects.all())
    goal_path = serializers.SerializerMethodField()
    domain = serializers.SerializerMethodField()
    streak = serializers.SerializerMethodField()
    done_today = serializers.SerializerMethodField()
    due_today = serializers.SerializerMethodField()
    completion_30d = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = [
            "id",
            "goal",
            "title",
            "frequency",
            "days",
            "created_at",
            "goal_path",
            "domain",
            "streak",
            "done_today",
            "due_today",
            "completion_30d",
        ]
        read_only_fields = ["created_at"]

    def validate_days(self, value) -> list[int]:
        if not isinstance(value, list) or not all(isinstance(d, int) and 0 <= d <= 6 for d in value):
            raise serializers.ValidationError("Les jours doivent être des nombres de 0 (lundi) à 6 (dimanche).")
        if len(set(value)) != len(value):
            raise serializers.ValidationError("Chaque jour ne peut apparaître qu'une fois.")
        return sorted(value)

    def validate(self, attrs: dict) -> dict:
        frequency = attrs.get("frequency", getattr(self.instance, "frequency", Frequency.DAILY))
        days = attrs.get("days", getattr(self.instance, "days", []))
        if frequency == Frequency.WEEKLY and not days:
            raise serializers.ValidationError({"days": "Choisis au moins un jour pour une habitude hebdomadaire."})
        return attrs

    def _done(self, habit: Habit) -> set:
        return habit_done_dates(self.context)[habit.id]

    def get_goal_path(self, habit: Habit) -> list[dict]:
        index = progress_index(self.context)
        goal = index.goals.get(habit.goal_id) if habit.goal_id else None
        if goal is None:
            return []
        return [goal_ref(g) for g in [*index.ancestors(goal.id), goal]]

    def get_domain(self, habit: Habit) -> dict | None:
        goal = progress_index(self.context).goals.get(habit.goal_id) if habit.goal_id else None
        return domain_ref(goal.domain) if goal is not None and goal.domain_id else None

    def get_streak(self, habit: Habit) -> int:
        return habits_rules.streak(habit, self._done(habit), timezone.localdate())

    def get_done_today(self, habit: Habit) -> bool:
        return timezone.localdate() in self._done(habit)

    def get_due_today(self, habit: Habit) -> bool:
        return habits_rules.is_due(habit, timezone.localdate(), self._done(habit))

    def get_completion_30d(self, habit: Habit) -> float | None:
        today = timezone.localdate()
        done = self._done(habit)
        start = max(today - timedelta(days=29), habits_rules.tracking_start(habit, done))
        rate = habits_rules.completion(habit, done, start, today, today)
        return None if rate is None else round(rate, 4)


class HabitCheckSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    done = serializers.BooleanField(default=True)

    def validate_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Impossible de cocher un jour futur.")
        return value


# --- Reviews ----------------------------------------------------------------

MAX_ANSWER_LENGTH = 5000


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "type", "period_start", "period_end", "answers", "created_at", "updated_at"]
        read_only_fields = ["period_end", "created_at", "updated_at"]

    def validate_answers(self, value) -> dict:
        if not isinstance(value, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in value.items()):
            raise serializers.ValidationError("Les réponses doivent associer une question à un texte.")
        if any(len(v) > MAX_ANSWER_LENGTH for v in value.values()):
            raise serializers.ValidationError(f"Chaque réponse est limitée à {MAX_ANSWER_LENGTH} caractères.")
        return value

    def validate(self, attrs: dict) -> dict:
        review_type = attrs.get("type", getattr(self.instance, "type", None))
        start = attrs.get("period_start", getattr(self.instance, "period_start", None))
        expected_start, expected_end = period_bounds(review_type, start)
        if start != expected_start:
            raise serializers.ValidationError(
                {"period_start": f"Cette période doit commencer le {expected_start:%d/%m/%Y}."}
            )
        duplicates = Review.objects.filter(user=self.context["request"].user, type=review_type, period_start=start)
        if self.instance is not None:
            duplicates = duplicates.exclude(pk=self.instance.pk)
        if duplicates.exists():
            raise serializers.ValidationError({"period_start": "Une revue existe déjà pour cette période."})
        attrs["period_end"] = expected_end
        return attrs


# --- Focus sessions -----------------------------------------------------------

# Clock drift allowed between the device that timed the session and the server.
CLOCK_TOLERANCE = timedelta(minutes=5)
MAX_CAPTURED_NOTES = 20
MAX_NOTE_LENGTH = 200


class FocusSessionSerializer(serializers.ModelSerializer):
    task = OwnedPrimaryKeyRelatedField(queryset=Task.objects.all(), allow_null=True, required=False)
    task_title = serializers.SerializerMethodField()

    class Meta:
        model = FocusSession
        fields = [
            "id",
            "task",
            "task_title",
            "mode",
            "started_at",
            "ended_at",
            "duration_seconds",
            "planned_minutes",
            "intention",
            "quality",
            "distractions",
            "captured_notes",
            "created_at",
        ]
        read_only_fields = ["created_at"]
        extra_kwargs = {
            "quality": {
                "min_value": 1,
                "max_value": 5,
                "error_messages": {
                    "min_value": "La note va de 1 à 5.",
                    "max_value": "La note va de 1 à 5.",
                },
            },
        }

    def get_task_title(self, session: FocusSession) -> str | None:
        return session.task.title if session.task_id else None

    def validate(self, attrs: dict) -> dict:
        started = final_value(self, attrs, "started_at")
        ended = final_value(self, attrs, "ended_at")
        duration = final_value(self, attrs, "duration_seconds")
        if ended <= started:
            raise serializers.ValidationError({"ended_at": "La fin doit être après le début."})
        if ended > timezone.now() + CLOCK_TOLERANCE:
            raise serializers.ValidationError({"ended_at": "Une session ne peut pas finir dans le futur."})
        if duration < 1:
            raise serializers.ValidationError({"duration_seconds": "La session est vide."})
        # Pauses can only shorten a session; one second of rounding is allowed.
        if duration > (ended - started).total_seconds() + 1:
            raise serializers.ValidationError(
                {"duration_seconds": "La durée dépasse le temps écoulé entre le début et la fin."}
            )
        if final_value(self, attrs, "mode") == FocusMode.TIMER and not final_value(self, attrs, "planned_minutes"):
            raise serializers.ValidationError({"planned_minutes": "Indique la durée du minuteur."})
        return attrs

    def validate_captured_notes(self, notes) -> list[str]:
        if not isinstance(notes, list) or not all(isinstance(note, str) for note in notes):
            raise serializers.ValidationError("Liste de pensées invalide.")
        if len(notes) > MAX_CAPTURED_NOTES:
            raise serializers.ValidationError(f"{MAX_CAPTURED_NOTES} pensées au maximum par session.")
        if any(len(note) > MAX_NOTE_LENGTH for note in notes):
            raise serializers.ValidationError(f"Une pensée fait au plus {MAX_NOTE_LENGTH} caractères.")
        return [note.strip() for note in notes if note.strip()]
