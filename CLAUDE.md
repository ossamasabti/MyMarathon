# MyMarathon — guide pour Claude

Application d'organisation des objectifs dans le temps : chaque tâche du quotidien est reliée à un objectif, lui-même rattaché à un horizon plus long (vision → annuel → trimestriel → mensuel → tâche). Une seule base de code frontend pour le web, Android et iOS.

## Architecture

```
backend/   Django 5.2 + DRF, API REST sous /api/, JWT (simplejwt), argon2
  config/    settings (tout vient de l'environnement / backend/.env), urls racine
  core/      briques partagées : OwnedQuerysetMixin (filtrage par utilisateur), health check
  accounts/  User personnalisé (identifiant = e-mail), inscription, profil, logout
app/       Expo SDK 58 + React Native + TypeScript strict, Expo Router
  src/app/          routes (fichier = écran). (auth) = connexion/inscription, (main) = app connectée
  src/api/          client.ts (fetch + refresh JWT automatique), hooks TanStack Query par ressource
  src/stores/       Zustand (authStore : statut, tokens)
  src/lib/          tokenStorage(.web).ts : SecureStore sur mobile, localStorage sur le web
  src/theme/        tokens couleurs clair/sombre, espacements, useTheme / useIsWide
  src/components/   composants partagés (Screen, Button, TextField, États vide/chargement/erreur, AppTabBar)
  src/i18n/fr.ts    tous les textes de l'interface
```

### Authentification
- `POST /api/auth/register/` → `{user, access, refresh}` ; `POST /api/auth/token/` (email, password) ; `POST /api/auth/token/refresh/` (rotation + blacklist) ; `POST /api/auth/logout/` (blacklist du refresh) ; `GET/PATCH /api/auth/me/`.
- Frontend : l'access token reste en mémoire, seul le refresh token est persisté. `apiRequest()` rafraîchit une fois sur 401 puis déconnecte si le refresh est rejeté.
- Garde de navigation : effet dans `src/app/_layout.tsx` (`useSegments` + `router.replace`) selon `authStore.status` ; les layouts `(auth)` et `(main)` ne rendent rien tant que le statut ne leur correspond pas.

### Navigation responsive
`src/app/(main)/_layout.tsx` utilise `expo-router/js-tabs` avec une barre personnalisée (`AppTabBar`) :
largeur ≥ 768 px → barre latérale avec tous les écrans ; sinon onglets en bas (Aujourd'hui, Semaine, Objectifs, Timeline, Plus). Les listes d'entrées sont dans `src/components/navigation.ts`. Les routes de détail (`goals/[id]`, `domains/[id]`) ne figurent pas dans la barre.

## Conventions
- Code, noms et commentaires en anglais ; **interface entièrement en français** (chaînes dans `src/i18n/fr.ts`, messages d'erreur API en français).
- TypeScript strict (+ `noUncheckedIndexedAccess`), pas de `any` non justifié. Alias `@/` → `app/src/`.
- Toute vue DRF sur des données utilisateur hérite de `core.mixins.OwnedQuerysetMixin` (le modèle a un champ `user`). Les objets d'autrui renvoient 404.
- Les règles métier (validation des horizons/dates, progression, retard) vivent côté backend et sont testées.
- Chaque écran gère chargement / vide / erreur avec `LoadingState`, `EmptyState`, `ErrorState`.
- Accessibilité : cibles tactiles ≥ 44 px (`MIN_TOUCH`), couleurs uniquement via les tokens de `theme/colors.ts` (contrastes AA).
- Ajouter une dépendance Expo avec `npx expo install <pkg>` (versions compatibles SDK). Expo évolue vite : vérifier la doc de la version du SDK (https://docs.expo.dev/versions/v58.0.0/) plutôt que la mémoire.
- Aucun secret dans le code : `backend/.env` et `app/.env` (non versionnés), modèles `.env.example`.
- Fin de chaque étape : tests, démarrage web vérifié, commit, puis attente de validation.

## Commandes utiles
Backend (depuis `backend/`, venv dans `backend/.venv`) :
```
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python manage.py migrate
.venv/Scripts/python manage.py runserver 0.0.0.0:8000
.venv/Scripts/python -m pytest
.venv/Scripts/python manage.py makemigrations
```
App (depuis `app/`) :
```
npm install
npx expo start --web        # web sur http://localhost:8081
npx expo start              # QR code pour Expo Go
npx tsc --noEmit            # contrôle de types
npx expo lint
npx expo export --platform web   # build web statique dans dist/
```

## Avancement
- [x] Étape 1 : dépôt, auth JWT, navigation et écrans vides, connexion app ↔ API
- [ ] Étape 2 : Domaines, Objectifs, Tâches + progression (Aujourd'hui, Arbre, Domaine, Détail)
- [ ] Étape 3 : Semaine et Timeline
- [ ] Étape 4 : Habitudes et Revues guidées
- [ ] Étape 5 : Statistiques, notifications locales, build APK (EAS) et web
