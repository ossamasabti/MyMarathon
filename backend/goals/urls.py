from rest_framework.routers import DefaultRouter

from .views import DomainViewSet, GoalViewSet, HabitViewSet, ReviewViewSet, TaskViewSet

router = DefaultRouter()
router.register("domains", DomainViewSet, basename="domain")
router.register("goals", GoalViewSet, basename="goal")
router.register("tasks", TaskViewSet, basename="task")
router.register("habits", HabitViewSet, basename="habit")
router.register("reviews", ReviewViewSet, basename="review")

urlpatterns = router.urls
