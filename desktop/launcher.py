"""MyMarathon desktop launcher (Windows .exe).

Runs the Django backend on 127.0.0.1 with a per-user SQLite database, serves the exported
web app from the same origin, and shows it in a native window (Edge WebView2 via pywebview).
Falls back to the default browser when no native window can be created.
"""

from __future__ import annotations

import logging
import os
import secrets
import socket
import sys
import threading
import urllib.request
import webbrowser
from pathlib import Path

APP_NAME = "MyMarathon"
HOST = "127.0.0.1"
# Fixed port: the web app keeps its session and preferences in localStorage, which is per origin.
PREFERRED_PORT = 8765

log = logging.getLogger("mymarathon")


def bundle_dir() -> Path:
    """Folder holding the backend code and the web build (PyInstaller temp dir once frozen)."""
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent.parent


def data_dir() -> Path:
    base = Path(os.environ.get("APPDATA") or Path.home())
    path = base / APP_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def setup_logging(data: Path) -> None:
    log_file = data / "mymarathon.log"
    # A windowed .exe has no console: give stray prints somewhere to go.
    if sys.stdout is None or sys.stderr is None:
        stream = open(log_file, "a", encoding="utf-8")  # noqa: SIM115 - lives as long as the app
        sys.stdout = sys.stdout or stream
        sys.stderr = sys.stderr or stream
    logging.basicConfig(
        filename=log_file,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def secret_key(data: Path) -> str:
    """One random key per installation, created on first launch."""
    key_file = data / "secret_key"
    if not key_file.exists():
        key_file.write_text(secrets.token_urlsafe(50), encoding="utf-8")
    return key_file.read_text(encoding="utf-8").strip()


def configure_django(data: Path) -> None:
    root = bundle_dir()
    if not getattr(sys, "frozen", False):
        sys.path.insert(0, str(root / "backend"))
        frontend = root / "app" / "dist-desktop"
    else:
        frontend = root / "frontend"
    if not (frontend / "index.html").is_file():
        raise SystemExit(f"Web build not found in {frontend}: run desktop/build.ps1.")

    # Real environment variables win over backend/.env, which is never bundled anyway.
    os.environ.update(
        {
            "DJANGO_SETTINGS_MODULE": "config.settings",
            "SECRET_KEY": secret_key(data),
            "DEBUG": "False",
            "SECURE_SSL_REDIRECT": "False",
            "ALLOWED_HOSTS": f"{HOST},localhost",
            "CORS_ALLOWED_ORIGINS": "",
            "DATABASE_URL": f"sqlite:///{(data / 'db.sqlite3').as_posix()}",
            "FRONTEND_DIR": str(frontend),
        }
    )

    import django
    from django.core.management import call_command

    django.setup()
    call_command("migrate", interactive=False, verbosity=0)


def is_running(port: int) -> bool:
    """True when another MyMarathon instance already answers on this port."""
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/api/health/", timeout=1) as response:
            return response.status == 200
    except OSError:
        return False


def port_is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex((HOST, port)) != 0


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((HOST, 0))
        return sock.getsockname()[1]


def start_server(port: int):
    from django.core.wsgi import get_wsgi_application
    from waitress import create_server

    server = create_server(get_wsgi_application(), host=HOST, port=port, threads=8)
    threading.Thread(target=server.run, daemon=True, name="waitress").start()
    log.info("Server listening on http://%s:%s", HOST, port)
    return server


def open_window(url: str, data: Path) -> bool:
    """Blocks until the window is closed. False if no native window could be created."""
    try:
        import webview

        webview.create_window(APP_NAME, url, width=1280, height=820, min_size=(900, 600))
        webview.start(private_mode=False, storage_path=str(data / "webview"))
        return True
    except Exception:
        log.exception("Native window unavailable, falling back to the browser")
        return False


def main() -> None:
    data = data_dir()
    setup_logging(data)

    if is_running(PREFERRED_PORT):
        # Already open: show another window on the running instance.
        url = f"http://{HOST}:{PREFERRED_PORT}/"
        if not open_window(url, data):
            webbrowser.open(url)
        return

    configure_django(data)
    port = PREFERRED_PORT if port_is_free(PREFERRED_PORT) else free_port()
    server = start_server(port)
    url = f"http://{HOST}:{port}/"

    if open_window(url, data):
        server.close()
        return
    webbrowser.open(url)
    threading.Event().wait()  # keep serving the browser tab until the process is ended


if __name__ == "__main__":
    main()
