from pathlib import Path

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.views.static import serve
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request: Request) -> Response:
    return Response({"status": "ok"})


def frontend(request: HttpRequest, path: str = "") -> HttpResponse:
    """Serve the exported web app (desktop build): a real file if it exists, else index.html."""
    root = Path(settings.FRONTEND_DIR)
    candidate = (root / path).resolve()
    if path and candidate.is_file() and candidate.is_relative_to(root.resolve()):
        return serve(request, path, document_root=root)
    return serve(request, "index.html", document_root=root)
