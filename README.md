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
Après une mise à jour du dépôt, pense à `python manage.py migrate` (nouvelles tables).
Si le pare-feu Windows bloque le port 8000, autorise Python sur les réseaux privés.

## Contrôles qualité de l'app
```bash
cd app
npx tsc --noEmit
npx expo lint
npx expo export --platform web
```

## Concentration (chrono et minuteur)
- Dans le détail d'une tâche : **heure de début / fin** (créneau sur la date planifiée) et bouton **Se concentrer sur cette tâche** ; l'écran **Concentration** (menu) permet aussi une session libre.
- **Chrono** (le temps monte) ou **minuteur** (25, 45, 60 min ou durée libre). Pause, reprise, fin ; la session continue si tu changes d'écran ou recharges la page.
- Fin du minuteur : signal sonore sur PC / web (fenêtre ouverte), notification et vibration sur téléphone.
- Bouton ▶ sur chaque tâche : lance le chrono sur cette tâche (elle passe « En cours »).
- **Chaque minute** de concentration est ajoutée automatiquement au **temps passé** de la tâche (affiché sur la ligne de la tâche, cumulé sur toutes les sessions) et à la tuile « Concentration (30 jours) » ; si l'app se ferme, les minutes déjà comptées restent. Une session de moins d'une minute n'est pas comptée ; « Abandonner » retire les minutes de la session.

## Rappels (notifications locales)
Dans **Réglages → Rappels** (application mobile uniquement) :
- **Rappels d'échéance** : à 9 h le jour d'échéance d'une tâche, et 3 jours avant la fin d'un objectif actif ;
- **Rappel de revue** : le dimanche à 18 h.

Les rappels sont recalculés à chaque ouverture de l'application. Ils fonctionnent dans Expo Go et dans l'APK ; ils n'existent pas sur le web.

## Build web
```bash
cd app
# L'adresse de l'API est figée au moment de l'export :
EXPO_PUBLIC_API_URL=https://api.mondomaine.fr npx expo export --platform web
npx serve dist --single      # test local du build (application d'une seule page)
```
Le dossier `app/dist/` se dépose sur n'importe quel hébergement statique ; toutes les routes doivent renvoyer `index.html`. Ajoute l'origine du site à `CORS_ALLOWED_ORIGINS` côté backend.

## APK Android de test (EAS)
Le profil `preview` (`app/eas.json`) produit un APK qui parle au backend de ton PC sur le Wi-Fi (`http://192.168.1.31:8000` ; modifie l'adresse si l'IP du PC change) :
1. `cd app && npx eas-cli login` (compte Expo gratuit), puis `npx eas-cli init` la première fois ;
2. `npx eas-cli build --platform android --profile preview` : le build se fait dans le cloud Expo et donne un lien de téléchargement de l'APK ;
3. sur le PC : `ALLOWED_HOSTS` contient l'IP du PC (`backend/.env`), le backend tourne avec `runserver 0.0.0.0:8000`, et le pare-feu Windows autorise Python sur les réseaux privés ;
4. sur le téléphone (même Wi-Fi) : installer l'APK (autoriser les sources inconnues).

Le HTTP non chiffré n'est autorisé que pour ce profil de test (`app.config.ts`).

## Version Windows (.exe) à partager
`MyMarathon.exe` est une application autonome : elle contient le serveur, l'interface web et une base SQLite. Rien à installer, aucun serveur à héberger.

Construire (Windows 64 bits, Python 3.13 et Node.js installés) :
```powershell
powershell -ExecutionPolicy Bypass -File desktop/build.ps1
```
Le fichier produit est `desktop/dist/MyMarathon.exe` (≈ 35 Mo) : c'est lui qu'on envoie.

À savoir pour les personnes qui le reçoivent :
- au premier lancement, Windows SmartScreen affiche « Windows a protégé votre ordinateur » (fichier non signé) : **Informations complémentaires → Exécuter quand même** ;
- chaque personne crée son compte au premier lancement ; les données restent sur son PC, dans `%APPDATA%\MyMarathon` (base, clé secrète, journal `mymarathon.log`), et survivent à une nouvelle version du `.exe` ;
- pas de synchronisation entre PC ni avec le téléphone ;
- l'app s'ouvre dans sa propre fenêtre (moteur Edge WebView2, présent sur Windows 10/11) ; fermer la fenêtre arrête l'app. Sans WebView2, elle s'ouvre dans le navigateur.

## Mise en production (à préparer)
- Backend : `DEBUG=False`, une vraie `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL=postgres://…`, puis `python manage.py migrate`, `python manage.py collectstatic` et `gunicorn config.wsgi` derrière un proxy HTTPS.
- App : définir l'URL HTTPS de l'API dans le profil `production` de `app/eas.json` (actuellement un emplacement réservé) puis `npx eas-cli build --platform android --profile production` (AAB pour le Play Store).
