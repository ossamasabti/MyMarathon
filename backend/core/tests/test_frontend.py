import pytest
from django.test import RequestFactory

from core.views import frontend


@pytest.fixture
def frontend_dir(tmp_path, settings):
    (tmp_path / "index.html").write_text("<html>app</html>", encoding="utf-8")
    (tmp_path / "_expo").mkdir()
    (tmp_path / "_expo" / "app.js").write_text("console.log(1)", encoding="utf-8")
    settings.FRONTEND_DIR = str(tmp_path)
    return tmp_path


def body(response) -> bytes:
    return b"".join(response.streaming_content)


def test_serves_existing_file(frontend_dir):
    response = frontend(RequestFactory().get("/_expo/app.js"), "_expo/app.js")
    assert response.status_code == 200
    assert body(response) == b"console.log(1)"


def test_unknown_route_falls_back_to_index(frontend_dir):
    response = frontend(RequestFactory().get("/goals/12"), "goals/12")
    assert body(response) == b"<html>app</html>"


def test_root_serves_index(frontend_dir):
    assert body(frontend(RequestFactory().get("/"), "")) == b"<html>app</html>"


def test_path_traversal_is_not_served(frontend_dir):
    outside = frontend_dir.parent / "secret.txt"
    outside.write_text("secret", encoding="utf-8")
    response = frontend(RequestFactory().get("/../secret.txt"), "../secret.txt")
    assert body(response) == b"<html>app</html>"
