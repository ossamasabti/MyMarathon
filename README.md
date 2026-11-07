<p align="center">
  <img src="app/assets/images/logo.svg" alt="" width="120" height="120">
</p>

<h1 align="center">MyMarathon</h1>

<p align="center">
  <strong>Chaque pas compte vers la ligne d'arrivée.</strong><br>
  Organise tes objectifs dans le temps, de la vision à 5 ans jusqu'à la tâche du jour,<br>
  et entraîne ta concentration comme un marathonien.
</p>

<p align="center">
  <a href="https://ossamasabti.pythonanywhere.com"><strong>Ouvrir l'application en ligne →</strong></a>
</p>

---

## Pourquoi MyMarathon ?
Les grandes réussites se construisent comme un marathon : un objectif lointain, découpé en étapes, et un effort régulier chaque jour. MyMarathon relie **chaque tâche du quotidien à la raison pour laquelle tu la fais** :

```
Vision (5 ans) → Objectif annuel → Trimestriel → Mensuel → Tâche du jour
```

Une seule application pour le **web**, **Android** et **Windows**.

## Fonctionnalités

### ✨ Une interface qui motive
- Design bleu nuit et bleu ciel, police Poppins, accent jaune pour les séries ; clair ou sombre.
- **Aujourd'hui** s'ouvre sur une bande bleu nuit : salutation, tâches faites sur prévues, série de concentration, habitudes et phrase du jour, jusqu'à « Journée bouclée ! 🏁 ».
- Petites récompenses : coche qui rebondit (et vibre sur téléphone), couleur du domaine sur chaque tâche.

### 🎯 Objectifs et tâches
- Objectifs par **domaine de vie** (santé, études, travail…), sur 4 horizons imbriqués.
- **Progression calculée automatiquement** (sous-objectifs, tâches faites, indicateur chiffré) et alerte quand un objectif **prend du retard**.
- Tâches avec date, priorité, durée estimée et **créneau horaire**.
- **Planifier demain** depuis l'accueil : ajoute le soir les tâches du lendemain.
- Vues **Aujourd'hui**, **Semaine** (planification jour par jour) et **Timeline** annuelle.
- **Modèle « Parcours doctoral »** : l'arbre complet d'une thèse de 3 ou 4 ans (vision, années, trimestres, premiers mois, premières tâches et habitudes de recherche) créé en un clic, avec aperçu.

### 📚 Bibliographie
- Une **fiche par article** : ajout en un clic avec le **DOI** (titre, auteurs, année, revue remplis automatiquement).
- Statut **À lire / En cours / Lu**, mots-clés, recherche, lien vers un objectif (« 60 articles » avance tout seul).
- **Fiche de lecture** guidée : résumé, contribution, méthode, limites, idées pour la thèse.
- **Export BibTeX** pour LaTeX / Overleaf, avec clés de citation (`\cite{cortes1995supportvector}`).

### 🧠 Concentration
- Méthodes **Pomodoro** (25/5), **cycles longs** (50/10) et **deep work** (90/20), minuteur ou chrono libre.
- Pauses guidées entre les cycles, enchaînement automatique possible.
- **Intention** avant la session, bouton **Distraction** pour noter une pensée sans perdre le fil, **bilan** de qualité à la fin.
- Chaque minute est ajoutée au **temps passé** sur la tâche.
- **Objectif quotidien**, **série de jours**, records et **14 trophées** à débloquer.
- Statistiques : calendrier de 12 semaines, meilleures heures, temps par domaine.

### 🔁 Habitudes et revues
- Habitudes quotidiennes ou hebdomadaires reliées à un objectif, avec **séries** et taux de réussite.
- **Revues guidées** hebdomadaires, mensuelles et trimestrielles, avec un résumé automatique de la période.

### 📊 Statistiques et rappels
- Progression par domaine, tâches terminées par semaine, objectifs en retard.
- Rappels sur le téléphone : échéances, revue, programme du jour à 8 h et alerte avant chaque tâche qui a un horaire.
- Thème clair / sombre, interface entièrement en français.

## Utiliser l'application
| Plateforme | Comment |
|---|---|
| 🌐 **Web** (PC, tablette, téléphone) | [ossamasabti.pythonanywhere.com](https://ossamasabti.pythonanywhere.com) : crée ton compte, rien à installer |
| 🤖 **Android** | APK construit avec EAS (voir [APK Android](#apk-android-eas)), connecté au même compte que le site |
| 🪟 **Windows** | `MyMarathon.exe` : l'application dans sa propre fenêtre (voir [Version Windows](#version-windows-exe)) |

Le site, l'application Android et la version Windows partagent le même compte et les mêmes données.

## Technologies
| Partie | Outils |
|---|---|
| Backend | Python 3.13, Django 5.2, Django REST Framework, JWT (simplejwt), argon2 |
| Application | Expo SDK 58, React Native, TypeScript strict, Expo Router, TanStack Query, Zustand |
| Windows | PyInstaller, waitress, pywebview (Edge WebView2) |
| Hébergement | PythonAnywhere (SQLite) ; Render + Neon PostgreSQL en alternative (Dockerfile) |

```
backend/   API REST Django (/api/) : comptes, objectifs, tâches, habitudes, revues, concentration, statistiques
app/       application Expo (web, Android, iOS) en TypeScript
desktop/   version Windows (.exe), fenêtre sur le site en ligne
deploy/    scripts de mise en ligne (PythonAnywhere)
```

---

# Développement

## Prérequis
- Python 3.12+ (testé avec 3.13)
- Node.js 20+ (testé avec 22) et npm
- Pour le mobile : l'application **Expo Go**, sur le même réseau Wi-Fi que le PC

## Ouvrir l'app en un clic
Sous Windows, double-clique sur **`MyMarathon-dev.bat`** à la racine du dépôt. Il ouvre deux fenêtres, l'API (migrations puis `runserver 0.0.0.0:8000`) et l'app web (`npx expo start --web`), puis le navigateur sur http://localhost:8081. Ferme les deux fenêtres pour tout arrêter ; un ancien serveur resté bloqué sur le port 8081 est arrêté automatiquement.

Les installations ci-dessous (venv Python, `npm install`) doivent avoir été faites une fois.

## Backend
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
Vérification : http://localhost:8000/api/health/ renvoie `{"status": "ok"}`. Tests : `pytest` (depuis `backend/`, venv activé).

## Application web
```bash
cd app
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://localhost:8000
npx expo start --web
```
L'app s'ouvre sur http://localhost:8081 (origine autorisée par défaut dans `CORS_ALLOWED_ORIGINS`).

## Application mobile (Expo Go)
1. Trouve l'adresse IP locale du PC (`ipconfig` sous Windows), par exemple `192.168.1.20`.
2. Dans `backend/.env` : ajoute-la à `ALLOWED_HOSTS` (`localhost,127.0.0.1,192.168.1.20`), puis lance `python manage.py runserver 0.0.0.0:8000`.
3. Dans `app/.env` : `EXPO_PUBLIC_API_URL=http://192.168.1.20:8000`.
4. `cd app && npx expo start`, puis scanne le QR code avec Expo Go (Android) ou l'appareil photo (iOS).

Émulateur Android : utilise `http://10.0.2.2:8000`. Après une mise à jour du dépôt, pense à `python manage.py migrate`. Si le pare-feu Windows bloque le port 8000, autorise Python sur les réseaux privés.

## Contrôles qualité
```bash
cd backend && pytest
cd app && npx tsc --noEmit && npx expo lint
```

## Concentration : détails
- Dans le détail d'une tâche : **heure de début / fin** et bouton **Se concentrer sur cette tâche** ; l'écran **Concentration** permet aussi une session libre. Bouton ▶ sur chaque tâche : chrono sur cette tâche (elle passe « En cours »).
- La session continue si tu changes d'écran ou recharges la page. Fin du minuteur : signal sonore sur PC / web, notification et vibration sur téléphone.
- **Chaque minute** est enregistrée sur le serveur ; une session de moins d'une minute n'est pas comptée ; « Abandonner » retire les minutes de la session.
- Méthodes : à la fin d'un cycle, la pause démarre seule, puis « Lancer le cycle suivant » ; option **Enchaîner les cycles automatiquement** dans Réglages.
- Objectif quotidien modifiable (2 h par défaut) depuis la carte « Concentration du jour » ou les Réglages.

## Rappels (notifications locales)
Dans **Réglages → Rappels** (application mobile uniquement) : à 9 h le jour d'échéance d'une tâche, 3 jours avant la fin d'un objectif actif, revue le dimanche à 18 h, et (« Rappels des tâches à venir ») le programme du jour à 8 h plus une alerte 5 min à 1 h avant chaque tâche planifiée avec un horaire. Recalculés à chaque ouverture de l'app ; inexistants sur le web.

## APK Android (EAS)
Le profil `preview` (`app/eas.json`) produit un APK connecté au site en ligne `https://ossamasabti.pythonanywhere.com` (Wi-Fi ou 4G) :
1. `cd app && npx eas-cli login` (compte Expo gratuit), puis `npx eas-cli init` la première fois ;
2. `npx eas-cli build --platform android --profile preview` : le build se fait dans le cloud Expo et donne un lien de téléchargement ;
3. sur le téléphone : installer l'APK (autoriser les sources inconnues).

Pour un APK vers le backend du PC (même Wi-Fi), mettre `http://<IP du PC>:8000` dans le profil, l'IP dans `ALLOWED_HOSTS` et lancer `runserver 0.0.0.0:8000`. Le HTTP non chiffré n'est autorisé que si l'URL de l'API du build commence par `http://` (`app.config.ts`).

## Version Windows (.exe)
`MyMarathon.exe` ouvre l'application en ligne dans sa propre fenêtre Windows (Edge WebView2, présent sur Windows 10/11) : même compte et mêmes données que le site et le téléphone, toujours à jour sans le reconstruire. Il faut une connexion Internet ; sans elle, une page « Pas de connexion » réessaie toute seule.

Construire (Windows 64 bits, Python 3.13) :
```powershell
powershell -ExecutionPolicy Bypass -File desktop/build.ps1
```
Résultat : `desktop/dist/MyMarathon.exe` (≈ 12 Mo). Au premier lancement chez quelqu'un d'autre, Windows SmartScreen peut afficher « Windows a protégé votre ordinateur » (fichier non signé) : **Informations complémentaires → Exécuter quand même**.

## Mise en ligne (PythonAnywhere, gratuit sans carte)
Un seul site `https://<utilisateur>.pythonanywhere.com` sert l'API **et** la version web (même adresse, pas de CORS) ; base SQLite chez PythonAnywhere.
- `deploy/publish-web.ps1` (PC, PowerShell) : export web Expo (`EXPO_PUBLIC_API_URL=/`) poussé sur la branche `web-build` (un seul commit, forcé). L'offre gratuite n'a ni la place ni le Node nécessaires pour construire l'export.
- `deploy/pythonanywhere/update.sh` (console Bash de PythonAnywhere) : `git pull`, récupération de `web-build`, virtualenv `~/.virtualenvs/mymarathon`, `backend/.env` généré une fois (`SECRET_KEY` aléatoire, `DEBUG=False`, hôte, `FRONTEND_DIR`, `STATIC_MANIFEST`), `migrate`, `collectstatic`, fichier WSGI réécrit puis rechargement.

Première mise en ligne :
1. PC : `powershell -ExecutionPolicy Bypass -File deploy/publish-web.ps1` ;
2. pythonanywhere.com : compte gratuit (« Beginner ») ; onglet **Web** → **Add a new web app** → **Manual configuration** → **Python 3.13** ; champ **Virtualenv** : `/home/<utilisateur>/.virtualenvs/mymarathon` ; **Force HTTPS** activé ;
3. onglet **Consoles** → **Bash** : `git clone https://github.com/ossamasabti/MyMarathon.git` puis `bash ~/MyMarathon/deploy/pythonanywhere/update.sh` ;
4. mettre l'adresse dans les profils de `app/eas.json` et reconstruire l'APK.

Mise à jour : `publish-web.ps1` si l'app a changé, push sur `main`, puis `update.sh` dans la console. Offre gratuite : cliquer sur **Run until 3 months from today** (onglet Web) au moins tous les 3 mois.

## Mise en ligne alternative (Render + Neon)
Render demande une carte bancaire (vérification, offre gratuite). Un seul service sert l'API et la version web ; la base est un PostgreSQL Neon.
- `Dockerfile` (racine) : export web Expo, puis Django + `gunicorn` ; `collectstatic` au build, `migrate` à chaque démarrage ; fichiers statiques servis par WhiteNoise.
- `render.yaml` (Blueprint) : service gratuit, région Frankfurt, `SECRET_KEY` générée, `DATABASE_URL` à coller, contrôle de santé `/api/health/` ; l'adresse Render est ajoutée automatiquement à `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`.

Étapes : projet **Neon** (région Europe, chaîne `postgresql://…?sslmode=require`), puis **Render → New → Blueprint** sur ce dépôt, chaîne Neon dans `DATABASE_URL`, **Apply**. Chaque push sur `main` redéploie ; le service gratuit s'endort après ~15 min sans visite.

## Autre hébergeur
- Backend : `DEBUG=False`, une vraie `SECRET_KEY`, `ALLOWED_HOSTS`, `DATABASE_URL`, `STATIC_MANIFEST=True`, puis `migrate`, `collectstatic` et `gunicorn config.wsgi` derrière un proxy HTTPS (ou l'image `Dockerfile`).
- App : URL HTTPS de l'API dans `app/eas.json` ; le profil `production` produit un AAB pour le Play Store.
