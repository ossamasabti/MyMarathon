from django.conf import settings
from django.db import models
from django.utils import timezone


class Domain(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="domains")
    name = models.CharField("nom", max_length=60)
    icon = models.CharField("icône", max_length=40, blank=True)
    color = models.CharField("couleur", max_length=7, default="#1F5FD1")
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "objectif"
        ordering = ["start_date", "id"]

    def __str__(self) -> str:
        return self.title

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
    priority = models.CharField("priorité", max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    estimated_minutes = models.PositiveIntegerField("durée estimée (min)", null=True, blank=True)
    status = models.CharField("statut", max_length=12, choices=TaskStatus.choices, default=TaskStatus.TODO)
    completed_at = models.DateTimeField("terminée le", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "tâche"
        ordering = ["planned_date", "due_date", "id"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        # completed_at mirrors the status.
        if self.status == TaskStatus.DONE and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != TaskStatus.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)
