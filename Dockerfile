# Hosted image (Render): the Django API plus the exported web app, served from one origin.

# --- 1. Web app export (same as the desktop build: relative API calls) ---------
FROM node:22-slim AS web
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ ./
RUN EXPO_PUBLIC_API_URL=/ npx expo export --platform web --output-dir dist-web

# --- 2. Django served by gunicorn ------------------------------------------------
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_MANIFEST=True \
    FRONTEND_DIR=/srv/frontend
WORKDIR /srv/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=web /app/dist-web /srv/frontend
# Build-time key only: the real SECRET_KEY comes from the host's environment at run time.
RUN SECRET_KEY=collectstatic-only python manage.py collectstatic --noinput

RUN useradd --create-home app && chown -R app /srv
USER app

# Migrations run at each start (fast when there is nothing new), then the WSGI server.
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn config.wsgi --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 60 --access-logfile -"]
