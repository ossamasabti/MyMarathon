from django.conf import settings
from django.db import models
from django.utils import timezone


class Domain(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="domains")
    name = models.CharField("nom", max_length=60)
    icon = models.CharField("icône", max_length=40, blank=True)
    color = models.CharField("couleur", max_length=7, default="#2A78D6")
    order = models.PositiveIntegerField("ordre", default=0)

    class Meta:
        verbose_name = "domaine"
        ordering = ["order", "name"]
        constraints = [models.UniqueConstraint(fields=["user", "name"], name="unique_domain_name_per_user")]

    def __str__(self) -> str:
        return self.name


class Horizon(models.TextChoices):
    VISION = "vision", "Vision"
    ANNUAL = "annual", "Annuel"
    QUARTERLY = "quarterly", "Trimestriel"
    MONTHLY = "monthly", "Mensuel"


# Higher rank = longer horizon. A child must have a strictly lower rank than its parent.
HORIZON_RANK = {
    Horizon.MONTHLY: 1,
    Horizon.QUARTERLY: 2,
    Horizon.ANNUAL: 3,
    Horizon.VISION: 4,
}


class GoalStatus(models.TextChoices):
    ACTIVE = "active", "Actif"
    PAUSED = "paused", "En pause"
    ACHIEVED = "achieved", "Atteint"
    ABANDONED = "abandoned", "Abandonné"


class Goal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goals")
    domain = models.ForeignKey(Domain, on_delete=models.SET_NULL, null=True, blank=True, related_name="goals")
    # Orphaned children become roots rather than being deleted in cascade.
    parent = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="children")
    title = models.CharField("titre", max_length=200)
    description = models.TextField(blank=True)
    horizon = models.CharField(max_length=10, choices=Horizon.choices)
    start_date = models.DateField("date de début")
    end_date = models.DateField("date de fin")
    status = models.CharField("statut", max_length=10, choices=GoalStatus.choices, default=GoalStatus.ACTIVE)
    target_value = models.DecimalField("indicateur cible", max_digits=12, decimal_places=2, null=True, blank=True)
    current_value = models.DecimalField("indicateur actuel", max_digits=12, decimal_places=2, null=True, blank=True)
    unit = models.CharField("unité", max_length=30, blank=True)
    achieved_at = models.DateTimeField("atteint le", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "objectif"
        ordering = ["start_date", "id"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        # achieved_at mirrors the status (used by period reviews).
        if self.status == GoalStatus.ACHIEVED and self.achieved_at is None:
            self.achieved_at = timezone.now()
        elif self.status != GoalStatus.ACHIEVED:
            self.achieved_at = None
        super().save(*args, **kwargs)

    @property
    def rank(self) -> int:
        return HORIZON_RANK[self.horizon]


class Priority(models.TextChoices):
    HIGH = "high", "Haute"
    NORMAL = "normal", "Normale"
    LOW = "low", "Basse"


class TaskStatus(models.TextChoices):
    TODO = "todo", "À faire"
    IN_PROGRESS = "in_progress", "En cours"
    DONE = "done", "Fait"


class Task(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks")
    title = models.CharField("titre", max_length=200)
    notes = models.TextField(blank=True)
    due_date = models.DateField("échéance", null=True, blank=True)
    planned_date = models.DateField("date planifiée", null=True, blank=True)
    # Planned time slot on planned_date (both optional; end requires start).
    start_time = models.TimeField("heure de début", null=True, blank=True)
    end_time = models.TimeField("heure de fin", null=True, blank=True)
    priority = models.CharField("priorité", max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    estimated_minutes = models.PositiveIntegerField("durée estimée (min)", null=True, blank=True)
    status = models.CharField("statut", max_length=12, choices=TaskStatus.choices, default=TaskStatus.TODO)
    completed_at = models.DateTimeField("terminée le", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "tâche"
        ordering = ["planned_date", models.F("start_time").asc(nulls_last=True), "due_date", "id"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        # completed_at mirrors the status.
        if self.status == TaskStatus.DONE and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != TaskStatus.DONE:
            self.completed_at = None
        # A time slot only exists on a planned day.
        if self.planned_date is None:
            self.start_time = self.end_time = None
        super().save(*args, **kwargs)


class FocusMode(models.TextChoices):
    STOPWATCH = "stopwatch", "Chrono"
    TIMER = "timer", "Minuteur"


class FocusSession(models.Model):
    """A finished focus session (stopwatch or timer), optionally on a task."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="focus_sessions")
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name="focus_sessions")
    mode = models.CharField("mode", max_length=10, choices=FocusMode.choices)
    started_at = models.DateTimeField("début")
    ended_at = models.DateTimeField("fin")
    # Focused time, pauses excluded.
    duration_seconds = models.PositiveIntegerField("durée (s)")
    planned_minutes = models.PositiveIntegerField("durée visée (min)", null=True, blank=True)
    # The precise outcome aimed for, set before starting.
    intention = models.CharField("intention", max_length=200, blank=True)
    # Self-assessed focus quality (1-5), given in the end-of-session review.
    quality = models.PositiveSmallIntegerField("qualité", null=True, blank=True)
    distractions = models.PositiveSmallIntegerField("distractions", default=0)
    # Thoughts jotted down during the session to deal with later (list of strings).
    captured_notes = models.JSONField("pensées notées", default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "session de concentration"
        ordering = ["-started_at", "-id"]

    def __str__(self) -> str:
        return f"{self.get_mode_display()} {self.started_at:%d/%m %H:%M}"


class Frequency(models.TextChoices):
    DAILY = "daily", "Quotidienne"
    WEEKLY = "weekly", "Hebdomadaire"


class Habit(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="habits")
    # Required by the API; SET_NULL keeps the habit and its history if the goal is deleted.
    goal = models.ForeignKey(Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name="habits")
    title = models.CharField("titre", max_length=200)
    frequency = models.CharField("fréquence", max_length=10, choices=Frequency.choices, default=Frequency.DAILY)
    # Weekdays, Monday = 0. Empty for a daily habit = every day.
    days = models.JSONField("jours", default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "habitude"
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return self.title


class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="logs")
    date = models.DateField()
    done = models.BooleanField(default=True)

    class Meta:
        verbose_name = "suivi d'habitude"
        ordering = ["date"]
        constraints = [models.UniqueConstraint(fields=["habit", "date"], name="unique_habit_log_per_day")]

    def __str__(self) -> str:
        return f"{self.habit} – {self.date}"


class ReviewType(models.TextChoices):
    WEEKLY = "weekly", "Hebdomadaire"
    MONTHLY = "monthly", "Mensuelle"
    QUARTERLY = "quarterly", "Trimestrielle"


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    type = models.CharField(max_length=10, choices=ReviewType.choices)
    period_start = models.DateField("début de période")
    period_end = models.DateField("fin de période")
    answers = models.JSONField("réponses", default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "revue"
        ordering = ["-period_start", "type"]
        constraints = [
            models.UniqueConstraint(fields=["user", "type", "period_start"], name="unique_review_per_period")
        ]

    def __str__(self) -> str:
        return f"{self.get_type_display()} {self.period_start}"
