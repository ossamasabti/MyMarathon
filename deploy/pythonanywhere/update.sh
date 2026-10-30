#!/bin/bash
# Installs or updates MyMarathon on PythonAnywhere (free plan, SQLite). Run it from a PythonAnywhere Bash console:
#   bash ~/MyMarathon/deploy/pythonanywhere/update.sh
# The web app (Web tab, "Manual configuration", same Python version as PYTHON below) must exist first.
set -euo pipefail

PYTHON="${PYTHON:-python3.13}"
REPO="https://github.com/ossamasabti/MyMarathon.git"
APP="$HOME/MyMarathon"
WEB="$HOME/MyMarathon-web"
VENV="$HOME/.virtualenvs/mymarathon"
HOST="${USER}.pythonanywhere.com"
WSGI_FILE="/var/www/${USER//./_}_pythonanywhere_com_wsgi.py"

echo "== Code"
git -C "$APP" pull --ff-only

# The web export is built on the PC (deploy/publish-web.ps1) and pushed to the web-build branch:
# the free plan has neither the disk space nor the Node version to build it here.
echo "== Web app (branch web-build)"
if [ -d "$WEB/.git" ]; then
    git -C "$WEB" fetch --depth 1 origin web-build
    git -C "$WEB" reset --hard FETCH_HEAD
else
    git clone --depth 1 --branch web-build "$REPO" "$WEB"
fi

echo "== Python packages"
[ -d "$VENV" ] || "$PYTHON" -m venv "$VENV"
"$VENV/bin/pip" install --quiet --upgrade pip
"$VENV/bin/pip" install --quiet -r "$APP/backend/requirements.txt"

ENV_FILE="$APP/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "== Settings (backend/.env, generated once)"
    umask 077
    cat > "$ENV_FILE" <<EOF
SECRET_KEY=$("$VENV/bin/python" -c 'import secrets; print(secrets.token_urlsafe(50))')
DEBUG=False
# HTTPS redirect done by PythonAnywhere ("Force HTTPS" in the Web tab).
SECURE_SSL_REDIRECT=False
ALLOWED_HOSTS=$HOST
CSRF_TRUSTED_ORIGINS=https://$HOST
FRONTEND_DIR=$WEB
STATIC_MANIFEST=True
SECURE_HSTS_SECONDS=31536000
EOF
fi

echo "== Database and static files"
cd "$APP/backend"
"$VENV/bin/python" manage.py migrate --noinput
"$VENV/bin/python" manage.py collectstatic --noinput --verbosity 0

echo "== WSGI file and reload"
cat > "$WSGI_FILE" <<EOF
# Written by deploy/pythonanywhere/update.sh: edit that script instead.
import os
import sys

sys.path.insert(0, "$APP/backend")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
EOF
touch "$WSGI_FILE"

echo "OK: https://$HOST"
