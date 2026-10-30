# MyMarathon

Organise tes objectifs dans le temps : de la vision à 5 ans jusqu'à la tâche du jour, chaque action est reliée à la raison pour laquelle tu la fais.

- `backend/` : API Django REST (JWT)
- `app/` : application Expo (web, Android, iOS) en TypeScript

## Prérequis
- Python 3.12+ (testé avec 3.13)
- Node.js 20+ (testé avec 22) et npm
- Pour le mobile : l'application **Expo Go** sur ton téléphone, sur le même réseau Wi-Fi que ton PC

## Ouvrir l'app en un clic (développement)
Double-clique sur **`MyMarathon-dev.bat`** à la racine du dépôt. Il ouvre deux fenêtres, l'API (migrations puis `runserver 0.0.0.0:8000`) et l'app web (`npx expo start --web`), puis le navigateur sur http://localhost:8081. Ferme les deux fenêtres pour tout arrêter. Un ancien serveur web resté bloqué sur le port 8081 est arrêté automatiquement. Pour un raccourci sur le Bureau : clic droit sur le fichier → **Envoyer vers → Bureau (créer un raccourci)**.

Les prérequis ci-dessous (venv Python, `npm install`) doivent avoir été faits une fois.

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

## Concentration (méthodes, objectif quotidien, trophées)
- Dans le détail d'une tâche : **heure de début / fin** (créneau sur la date planifiée) et bouton **Se concentrer sur cette tâche** ; l'écran **Concentration** (menu) permet aussi une session libre.
- **Chrono** (le temps monte) ou **minuteur** (25, 45, 60 min ou durée libre). Pause, reprise, fin ; la session continue si tu changes d'écran ou recharges la page.
- Fin du minuteur : signal sonore sur PC / web (fenêtre ouverte), notification et vibration sur téléphone.
- Bouton ▶ sur chaque tâche : lance le chrono sur cette tâche (elle passe « En cours »).
- **Chaque minute** de concentration est ajoutée automatiquement au **temps passé** de la tâche (affiché sur la ligne de la tâche, cumulé sur toutes les sessions) et à la tuile « Concentration (30 jours) » ; si l'app se ferme, les minutes déjà comptées restent. Une session de moins d'une minute n'est pas comptée ; « Abandonner » retire les minutes de la session.
- **Méthodes** : Pomodoro (25/5, pause longue de 15 min après 4 cycles), Cycles longs (50/10), Deep work (90/20), Minuteur, Chrono libre. À la fin d'un cycle, la pause démarre seule (compte à rebours, conseil de récupération), puis « Lancer le cycle suivant » ; option **Enchaîner les cycles automatiquement** dans Réglages.
- **Intention et bilan** : avant de démarrer, le résultat visé ; pendant, le bouton **Distraction** note une pensée pour plus tard ; à la fin (ou pendant la pause), note de qualité 1 à 5, nombre de distractions et pensées à transformer en tâches.
- **Objectif quotidien et série** : carte « Concentration du jour » sur Aujourd'hui (objectif modifiable, 2 h par défaut), série de jours où l'objectif est atteint, célébration une fois par jour.
- **Progrès** : records et 14 trophées sur l'écran Concentration ; dans Statistiques, calendrier de 12 semaines, meilleures heures et temps par domaine (30 jours).

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

Le HTTP non chiffré n'est autorisé que si l'URL de l'API du build commence par `http://` (`app.config.ts`) ; avec l'API en ligne (HTTPS), il est refusé.

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

## Mise en ligne (PythonAnywhere, gratuit sans carte)
Un seul site `https://<utilisateur>.pythonanywhere.com` sert l'API **et** la version web (même adresse, pas de CORS) ; base SQLite chez PythonAnywhere.
- `deploy/publish-web.ps1` (sur le PC, PowerShell) : export web Expo (`EXPO_PUBLIC_API_URL=/`) poussé sur la branche `web-build` (un seul commit, forcé). L'offre gratuite n'a ni la place ni le Node nécessaires pour construire l'export.
- `deploy/pythonanywhere/update.sh` (console Bash de PythonAnywhere) : `git pull` du code, récupération de `web-build`, virtualenv `~/.virtualenvs/mymarathon`, `backend/.env` généré une fois (`SECRET_KEY` aléatoire, `DEBUG=False`, hôte, `FRONTEND_DIR`, `STATIC_MANIFEST`), `migrate`, `collectstatic`, fichier WSGI réécrit puis rechargement.

Première mise en ligne :
1. PC : `powershell -ExecutionPolicy Bypass -File deploy/publish-web.ps1` ;
2. pythonanywhere.com : compte gratuit (« Beginner ») ; onglet **Web** → **Add a new web app** → **Manual configuration** → **Python 3.13** ; champ **Virtualenv** : `/home/<utilisateur>/.virtualenvs/mymarathon` ; **Force HTTPS** activé ;
3. onglet **Consoles** → **Bash** : `git clone https://github.com/ossamasabti/MyMarathon.git` puis `bash ~/MyMarathon/deploy/pythonanywhere/update.sh` ;
4. mettre l'adresse dans le profil `preview` de `app/eas.json` et reconstruire l'APK.

Mise à jour : `publish-web.ps1` si l'app a changé, push sur `main`, puis `update.sh` dans la console. Offre gratuite : cliquer sur **Run until 3 months from today** (onglet Web) au moins tous les 3 mois.

## Mise en ligne alternative (Render + Neon, carte bancaire demandée)
Un seul service Render sert l'API **et** la version web (même adresse, pas de CORS) ; la base est un PostgreSQL Neon.
- `Dockerfile` (racine) : export web Expo (`EXPO_PUBLIC_API_URL=/`), puis Django + `gunicorn` ; `collectstatic` au build, `migrate` à chaque démarrage. Fichiers statiques servis par WhiteNoise.
- `render.yaml` (Blueprint) : service gratuit, région Frankfurt, `SECRET_KEY` générée par Render, `DATABASE_URL` à coller, contrôle de santé `/api/health/`. L'adresse publique Render (`RENDER_EXTERNAL_HOSTNAME`) est ajoutée automatiquement à `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`.

Première mise en ligne :
1. **Neon** (neon.tech) : créer un projet (région Europe), copier la chaîne de connexion (`postgresql://…?sslmode=require`) ;
2. **Render** (render.com, connexion avec GitHub) : **New → Blueprint**, choisir le dépôt `MyMarathon`, coller la chaîne Neon dans `DATABASE_URL`, **Apply** ;
3. après le déploiement : ouvrir `https://<service>.onrender.com` (version web) ; mettre cette adresse dans le profil `preview` de `app/eas.json` et reconstruire l'APK.

Ensuite, chaque push sur `main` redéploie automatiquement. Offre gratuite : le service s'endort après ~15 min sans visite (premier chargement 30 à 60 s).

## Mise en production sur un autre hébergeur
- Backend : `DEBUG=False`, une vraie `SECRET_KEY`, `ALLOWED_HOSTS`, `DATABASE_URL=postgres://…`, `STATIC_MANIFEST=True`, puis `python manage.py migrate`, `python manage.py collectstatic` et `gunicorn config.wsgi` derrière un proxy HTTPS (ou l'image `Dockerfile`).
- App : URL HTTPS de l'API dans `app/eas.json` ; le profil `production` produit un AAB pour le Play Store.
