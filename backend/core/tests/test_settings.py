import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]


def load_settings(**env: str) -> dict:
    """Production-like settings, loaded in a fresh interpreter with the given environment."""
    script = (
        "import json, django; from django.conf import settings; django.setup(); "
        "print(json.dumps({'hosts': settings.ALLOWED_HOSTS, 'csrf': settings.CSRF_TRUSTED_ORIGINS, "
        "'middleware': settings.MIDDLEWARE, 'exempt': settings.SECURE_REDIRECT_EXEMPT, "
        "'storage': settings.STORAGES['staticfiles']['BACKEND'], "
        "'conn_max_age': settings.DATABASES['default']['CONN_MAX_AGE']}))"
    )
    environment = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "config.settings",
        "SECRET_KEY": "test-only",
        "DEBUG": "False",
        **env,
    }
    output = subprocess.run(
        [sys.executable, "-c", script], cwd=BACKEND_DIR, env=environment, capture_output=True, text=True, check=True
    )
    return json.loads(output.stdout.strip().splitlines()[-1])


def test_render_host_is_allowed_and_trusted():
    settings = load_settings(RENDER_EXTERNAL_HOSTNAME="mymarathon.onrender.com")
    assert "mymarathon.onrender.com" in settings["hosts"]
    assert "https://mymarathon.onrender.com" in settings["csrf"]


def test_hosted_static_files_and_health_check():
    settings = load_settings(STATIC_MANIFEST="True")
    assert "whitenoise.middleware.WhiteNoiseMiddleware" in settings["middleware"]
    assert settings["storage"] == "whitenoise.storage.CompressedManifestStaticFilesStorage"
    # The host's plain-HTTP health check must not be redirected to HTTPS.
    assert settings["exempt"] == [r"^api/health/$"]
    assert settings["conn_max_age"] == 60


def test_plain_static_storage_by_default():
    # The desktop build runs with DEBUG=False but without collectstatic.
    assert load_settings()["storage"] == "django.contrib.staticfiles.storage.StaticFilesStorage"
