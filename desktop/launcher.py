"""MyMarathon desktop launcher (Windows .exe).

Shows the online app (same account and data as the website and the Android app) in a native
window (Edge WebView2 via pywebview). Without a connection, a local page explains it and retries.
Falls back to the default browser when no native window can be created.
"""

from __future__ import annotations

import base64
import logging
import os
import ssl
import sys
import urllib.request
import webbrowser
from pathlib import Path

import certifi

APP_NAME = "MyMarathon"
# MYMARATHON_URL points the window at another server (e.g. http://localhost:8081 while developing).
SITE_URL = os.environ.get("MYMARATHON_URL", "https://ossamasabti.pythonanywhere.com/")
HEALTH_TIMEOUT_SECONDS = 10
AUTO_RETRY_SECONDS = 20

log = logging.getLogger("mymarathon")


def bundle_dir() -> Path:
    """Folder holding the bundled files (PyInstaller temp dir once frozen)."""
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parent.parent / "app" / "assets" / "images"


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


def site_is_reachable() -> bool:
    # certifi's CA bundle: an outdated Windows certificate store must not make the site look offline
    # (the window itself is Edge WebView2, which has its own up-to-date roots).
    context = ssl.create_default_context(cafile=certifi.where())
    url = f"{SITE_URL.rstrip('/')}/api/health/"
    try:
        with urllib.request.urlopen(url, timeout=HEALTH_TIMEOUT_SECONDS, context=context) as response:
            return response.status == 200
    except OSError as error:
        log.warning("Site unreachable: %s", error)
        return False


def offline_page() -> str:
    logo_file = bundle_dir() / "logo-small.png"
    logo = base64.b64encode(logo_file.read_bytes()).decode() if logo_file.is_file() else ""
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>{APP_NAME}</title>
<style>
  :root {{ --bg:#F7F8FA; --surface:#FFFFFF; --text:#14181F; --muted:#525B68; --border:#D5DAE1; --primary:#1F5FD1; --on-primary:#FFFFFF; }}
  @media (prefers-color-scheme: dark) {{
    :root {{ --bg:#0E1116; --surface:#171B22; --text:#EEF1F5; --muted:#A5AEBB; --border:#343C48; --primary:#7FAAF5; --on-primary:#0B1A33; }}
  }}
  body {{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:var(--bg); color:var(--text); font-family:"Segoe UI",system-ui,sans-serif; }}
  .card {{ max-width:420px; margin:16px; padding:32px; text-align:center; background:var(--surface);
          border:1px solid var(--border); border-radius:16px; }}
  img {{ width:72px; height:72px; border-radius:16px; }}
  h1 {{ font-size:22px; margin:16px 0 8px; }}
  p {{ color:var(--muted); line-height:1.5; margin:0 0 20px; }}
  button {{ min-height:44px; padding:0 24px; border:0; border-radius:10px; font-size:16px; font-weight:600;
           background:var(--primary); color:var(--on-primary); cursor:pointer; }}
  button:disabled {{ opacity:.6; cursor:default; }}
  #status {{ min-height:1.5em; margin:16px 0 0; font-size:14px; }}
</style></head>
<body><main class="card">
  {f'<img src="data:image/png;base64,{logo}" alt="">' if logo else ''}
  <h1>Pas de connexion</h1>
  <p>MyMarathon a besoin d'Internet pour retrouver ton compte et tes données.
     Vérifie ta connexion : l'application se rouvre toute seule dès qu'elle revient.</p>
  <button id="retry" type="button">Réessayer</button>
  <p id="status" role="status"></p>
</main>
<script>
  const button = document.getElementById('retry');
  const status = document.getElementById('status');
  let busy = false;
  async function retry(manual) {{
    if (busy || !window.pywebview) return;
    busy = true; button.disabled = true;
    if (manual) status.textContent = 'Connexion en cours…';
    const ok = await window.pywebview.api.retry();
    if (!ok) status.textContent = manual ? 'Toujours pas de connexion. Nouvel essai automatique dans quelques secondes.' : status.textContent;
    busy = false; button.disabled = false;
  }}
  button.addEventListener('click', () => retry(true));
  setInterval(() => retry(false), {AUTO_RETRY_SECONDS * 1000});
</script>
</body></html>"""


class OfflineApi:
    """Called from the offline page: loads the site once it answers."""

    def __init__(self) -> None:
        self.window = None

    def retry(self) -> bool:
        if not site_is_reachable():
            return False
        if self.window is not None:
            self.window.load_url(SITE_URL)
        return True


def open_window(data: Path) -> bool:
    """Blocks until the window is closed. False if no native window could be created."""
    try:
        import webview

        size = {"width": 1280, "height": 820, "min_size": (900, 600)}
        if site_is_reachable():
            webview.create_window(APP_NAME, SITE_URL, **size)
        else:
            api = OfflineApi()
            api.window = webview.create_window(APP_NAME, html=offline_page(), js_api=api, **size)
        # The session (refresh token) and preferences live in the WebView2 profile, kept between launches.
        webview.start(private_mode=False, storage_path=str(data / "webview"))
        return True
    except Exception:
        log.exception("Native window unavailable, falling back to the browser")
        return False


def main() -> None:
    data = data_dir()
    setup_logging(data)
    log.info("Opening %s", SITE_URL)
    if not open_window(data):
        webbrowser.open(SITE_URL)


if __name__ == "__main__":
    main()
