from django.contrib import admin

from .models import Domain, FocusSession, Goal, Habit, HabitLog, Reference, Review, Task


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "order"]
    list_filter = ["user"]


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ["title", "horizon", "status", "user", "start_date", "end_date"]
    list_filter = ["horizon", "status"]
    search_fields = ["title"]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "planned_date", "user"]
    list_filter = ["status", "priority"]
    search_fields = ["title"]


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ["title", "frequency", "goal", "user"]
    list_filter = ["frequency"]


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    list_display = ["habit", "date", "done"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["type", "period_start", "period_end", "user"]
    list_filter = ["type"]


@admin.register(FocusSession)
class FocusSessionAdmin(admin.ModelAdmin):
    list_display = ["started_at", "mode", "duration_seconds", "task", "user"]
    list_filter = ["mode"]


@admin.register(Reference)
class ReferenceAdmin(admin.ModelAdmin):
    list_display = ["title", "citation_key", "status", "user", "year"]
    list_filter = ["status", "kind"]
