from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DomainViewSet, FocusSessionViewSet, GoalViewSet, HabitViewSet, ReviewViewSet, TaskViewSet, stats

router = DefaultRouter()
router.register("domains", DomainViewSet, basename="domain")
router.register("goals", GoalViewSet, basename="goal")
router.register("tasks", TaskViewSet, basename="task")
router.register("habits", HabitViewSet, basename="habit")
router.register("reviews", ReviewViewSet, basename="review")
router.register("focus-sessions", FocusSessionViewSet, basename="focus-session")

urlpatterns = [path("stats/", stats, name="stats"), *router.urls]
