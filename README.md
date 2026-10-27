# MyMarathon

Organise tes objectifs dans le temps : de la vision à 5 ans jusqu'à la tâche du jour, chaque action est reliée à la raison pour laquelle tu la fais.

- `backend/` : API Django REST (JWT)
- `app/` : application Expo (web, Android, iOS) en TypeScript

## Prérequis
- Python 3.12+ (testé avec 3.13)
- Node.js 20+ (testé avec 22) et npm
- Pour le mobile : l'application **Expo Go** sur ton téléphone, sur le même réseau Wi-Fi que ton PC

## Lancer le backend
```bash
cd backend
python -m venv .venv
# Windows : .venv\Scripts\activate    macOS/Linux : source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # puis renseigne SECRET_KEY
python manage.py migrate
python manage.py createsuperuser   # facultatif, pour /admin
python manage.py runserver 0.0.0.0:8000
```
Vérification : http://localhost:8000/api/health/ renvoie `{"status": "ok"}`.

Tests : `pytest` (depuis `backend/`, venv activé).

En production, définis `DATABASE_URL=postgres://utilisateur:motdepasse@hote:5432/mymarathon`, `DEBUG=False`, `ALLOWED_HOSTS` et `CORS_ALLOWED_ORIGINS`.

## Lancer l'application web
```bash
cd app
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://localhost:8000
npx expo start --web
```
L'app s'ouvre sur http://localhost:8081 (origine autorisée par défaut dans `CORS_ALLOWED_ORIGINS`).

## Lancer l'application mobile (Expo Go)
1. Trouve l'adresse IP locale de ton PC (`ipconfig` sous Windows), par exemple `192.168.1.20`.
2. Dans `backend/.env` : ajoute-la à `ALLOWED_HOSTS` (`localhost,127.0.0.1,192.168.1.20`), puis lance `python manage.py runserver 0.0.0.0:8000`.
3. Dans `app/.env` : `EXPO_PUBLIC_API_URL=http://192.168.1.20:8000`.
4. `cd app && npx expo start`, puis scanne le QR code avec Expo Go (Android) ou l'appareil photo (iOS).

Émulateur Android : utilise `http://10.0.2.2:8000`.
Si le pare-feu Windows bloque le port 8000, autorise Python sur les réseaux privés.

## Contrôles qualité de l'app
```bash
cd app
npx tsc --noEmit
npx expo lint
npx expo export --platform web
```
