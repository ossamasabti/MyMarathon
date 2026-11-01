"""Ready-made plans that create a whole goal tree at once.

`build_phd_plan` is pure (used for the preview); `apply_plan` writes it for a user.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Domain, Frequency, Goal, Habit, Horizon, Priority, Task
from .rules import GoalShape, validate_goal

PHD_YEARS = (3, 4)
PHD_COLOR = "#6250D6"  # violet of the validated domain palette
PHD_ICON = "school-outline"
WEEKDAYS = [0, 1, 2, 3, 4]
FRIDAY = 4


def add_months(day: date, months: int) -> date:
    """Same day `months` later, clamped to the end of shorter months."""
    index = day.month - 1 + months
    year, month = day.year + index // 12, index % 12 + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


@dataclass
class PlannedTask:
    title: str
    due_date: date
    priority: str = Priority.NORMAL
    estimated_minutes: int | None = None


@dataclass
class PlannedHabit:
    title: str
    frequency: str
    days: list[int]


@dataclass
class PlannedGoal:
    title: str
    horizon: str
    start_date: date
    end_date: date
    description: str = ""
    target_value: Decimal | None = None
    unit: str = ""
    children: list[PlannedGoal] = field(default_factory=list)
    tasks: list[PlannedTask] = field(default_factory=list)
    habits: list[PlannedHabit] = field(default_factory=list)

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()

    def as_dict(self) -> dict:
        return {
            "title": self.title,
            "horizon": self.horizon,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "description": self.description,
            "target_value": None if self.target_value is None else str(self.target_value),
            "unit": self.unit,
            "tasks": [{"title": t.title, "due_date": t.due_date.isoformat()} for t in self.tasks],
            "habits": [{"title": h.title, "frequency": h.frequency, "days": h.days} for h in self.habits],
            "children": [child.as_dict() for child in self.children],
        }


def plan_counts(root: PlannedGoal) -> dict[str, int]:
    goals = list(root.walk())
    return {
        "goals": len(goals),
        "tasks": sum(len(g.tasks) for g in goals),
        "habits": sum(len(g.habits) for g in goals),
    }


# Year titles and their four quarters. The middle entries are used for a 4-year thesis only.
FIRST_YEAR = (
    "Année 1 : état de l'art et premiers résultats",
    "Cadrer le sujet et maîtriser l'état de l'art en lisant les travaux fondateurs et récents.",
    [
        ("Revue de littérature", "Lire et résumer les articles clés du domaine.", Decimal(60), "articles"),
        ("Reproduire les méthodes de référence et rédiger l'état de l'art",
         "Réimplémenter ou faire tourner les méthodes de référence ; premier jet du chapitre état de l'art.", None, ""),
        ("Premières expériences", "Tester une première idée sur des jeux de données de référence.", None, ""),
        ("Premier article et comité de suivi",
         "Soumettre un article en conférence ; préparer le bilan de 1re année.", None, ""),
    ],
)
MIDDLE_YEARS = [
    (
        "Contribution principale",
        "Proposer et valider la contribution centrale de la thèse.",
        [
            ("Formuler le problème", "Poser le modèle et les hypothèses de la contribution.", None, ""),
            ("Proposer une méthode", "Concevoir et implémenter la méthode.", None, ""),
            ("Validation expérimentale", "Comparer aux méthodes de référence, analyser les résultats.", None, ""),
            ("Article en revue", "Rédiger et soumettre un article en revue.", None, ""),
        ],
    ),
    (
        "Approfondissement et 2e contribution",
        "Étendre la contribution (nouveaux cas, garanties, application).",
        [
            ("Étendre la méthode", "Généraliser ou améliorer la contribution principale.", None, ""),
            ("Application", "Appliquer la méthode à un cas réel ou plus large.", None, ""),
            ("Analyse et comparaison", "Étude approfondie des résultats et de leurs limites.", None, ""),
            ("Deuxième publication", "Soumettre un deuxième article.", None, ""),
        ],
    ),
]
LAST_YEAR = (
    "Rédaction et soutenance",
    "Finaliser les résultats, rédiger le manuscrit et soutenir.",
    [
        ("Derniers résultats", "Compléter les expériences manquantes.", None, ""),
        ("Rédaction des chapitres", "Rédiger les chapitres de contribution, l'introduction et la conclusion.", None, ""),
        ("Manuscrit aux rapporteurs", "Relectures avec le directeur, envoi du manuscrit.", None, ""),
        ("Soutenance", "Préparer la présentation, répétitions, soutenance.", None, ""),
    ],
)
FIRST_MONTHS = [
    ("Cadrer le sujet et s'installer", "Problématique et calendrier validés avec le directeur ; outils prêts."),
    ("Lectures fondatrices", "Lire les articles fondateurs et en faire des fiches de lecture."),
    ("Synthèse des lectures", "Carte du domaine : méthodes, limites et questions ouvertes."),
]


def build_phd_plan(start: date, years: int, thesis_title: str) -> PlannedGoal:
    """Goal tree of a PhD: vision > years > quarters (> the first 3 months), with first tasks and habits."""
    if years not in PHD_YEARS:
        raise ValueError(f"years must be one of {PHD_YEARS}")

    def span(first_month: int, months: int) -> tuple[date, date]:
        return add_months(start, first_month), add_months(start, first_month + months) - timedelta(days=1)

    vision = PlannedGoal(
        thesis_title, Horizon.VISION, *span(0, 12 * years),
        description="Thèse de doctorat : du cadrage du sujet à la soutenance.",
        habits=[PlannedHabit("Journal de recherche (bilan, idées, prochaines étapes)", Frequency.WEEKLY, [FRIDAY])],
    )
    middle = MIDDLE_YEARS[: years - 2]
    year_specs = [FIRST_YEAR, *middle, LAST_YEAR]
    for index, (title, description, quarters) in enumerate(year_specs):
        if index > 0:
            title = f"Année {index + 1} : {title[0].lower()}{title[1:]}"
        year = PlannedGoal(title, Horizon.ANNUAL, *span(12 * index, 12), description=description)
        for q, (q_title, q_description, target, unit) in enumerate(quarters):
            year.children.append(
                PlannedGoal(
                    f"T{q + 1} : {q_title}", Horizon.QUARTERLY, *span(12 * index + 3 * q, 3),
                    description=q_description, target_value=target, unit=unit,
                )
            )
        vision.children.append(year)

    first_year = vision.children[0]
    first_year.habits.append(PlannedHabit("Écrire 300 mots", Frequency.DAILY, WEEKDAYS))
    first_quarter = first_year.children[0]
    first_quarter.habits.append(PlannedHabit("Lire un article (30 min)", Frequency.DAILY, WEEKDAYS))
    for m, (m_title, m_description) in enumerate(FIRST_MONTHS):
        first_quarter.children.append(PlannedGoal(m_title, Horizon.MONTHLY, *span(m, 1), description=m_description))

    framing, reading, synthesis = first_quarter.children
    framing.tasks = [
        PlannedTask("Rencontrer le directeur : cadrer le sujet et le calendrier", start + timedelta(days=6),
                    Priority.HIGH, 60),
        PlannedTask("Installer l'environnement : Python, gestionnaire de références, LaTeX/Overleaf",
                    start + timedelta(days=9), Priority.NORMAL, 90),
        PlannedTask("Lister 20 articles fondateurs", start + timedelta(days=13), Priority.HIGH, 90),
        PlannedTask("Rédiger une page de problématique", start + timedelta(days=20), Priority.HIGH, 120),
        PlannedTask("S'inscrire aux formations doctorales", framing.end_date, Priority.NORMAL, 30),
    ]
    reading.tasks = [PlannedTask("Rédiger 10 fiches de lecture", reading.end_date, Priority.NORMAL, 300)]
    synthesis.tasks = [
        PlannedTask("Faire la carte du domaine et la présenter au directeur", synthesis.end_date, Priority.HIGH, 180),
    ]
    return vision


@transaction.atomic
def apply_plan(user, root: PlannedGoal, domain_name: str) -> tuple[Domain, Goal]:
    """Create the domain and the whole tree for `user`; nothing is written if any part is invalid."""
    if Domain.objects.filter(user=user, name__iexact=domain_name).exists():
        raise ValidationError({"domain_name": f"Tu as déjà un domaine « {domain_name} ». Choisis un autre nom."})
    domain = Domain.objects.create(
        user=user, name=domain_name, icon=PHD_ICON, color=PHD_COLOR, order=Domain.objects.filter(user=user).count()
    )

    def create(planned: PlannedGoal, parent: Goal | None) -> Goal:
        errors = validate_goal(GoalShape(planned.horizon, planned.start_date, planned.end_date), parent)
        if errors:
            raise ValidationError({"detail": f"Modèle invalide pour « {planned.title} » : {errors}"})
        goal = Goal.objects.create(
            user=user, domain=domain, parent=parent, title=planned.title, description=planned.description,
            horizon=planned.horizon, start_date=planned.start_date, end_date=planned.end_date,
            target_value=planned.target_value, current_value=Decimal(0) if planned.target_value else None,
            unit=planned.unit,
        )
        Task.objects.bulk_create(
            Task(user=user, goal=goal, title=t.title, due_date=t.due_date, priority=t.priority,
                 estimated_minutes=t.estimated_minutes)
            for t in planned.tasks
        )
        for h in planned.habits:
            Habit.objects.create(user=user, goal=goal, title=h.title, frequency=h.frequency, days=h.days)
        for child in planned.children:
            create(child, goal)
        return goal

    return domain, create(root, None)
