from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

from core.views import frontend, health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("goals.urls")),
]

# Desktop build: the same server also serves the exported web app (single-page routing).
if settings.FRONTEND_DIR:
    urlpatterns.append(re_path(r"^(?!api/|admin/)(?P<path>.*)$", frontend, name="frontend"))
