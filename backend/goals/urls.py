from rest_framework.routers import DefaultRouter

from .views import DomainViewSet, GoalViewSet, TaskViewSet

router = DefaultRouter()
router.register("domains", DomainViewSet, basename="domain")
router.register("goals", GoalViewSet, basename="goal")
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = router.urls
