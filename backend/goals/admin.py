from django.contrib import admin

from .models import Domain, Goal, Task


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
