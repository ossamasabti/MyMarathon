# MyMarathon — guide pour Claude

Application d'organisation des objectifs dans le temps : chaque tâche du quotidien est reliée à un objectif, lui-même rattaché à un horizon plus long (vision → annuel → trimestriel → mensuel → tâche). Une seule base de code frontend pour le web, Android et iOS.

## Architecture

```
backend/   Django 5.2 + DRF, API REST sous /api/, JWT (simplejwt), argon2
  config/    settings (tout vient de l'environnement / backend/.env), urls racine
  core/      briques partagées : OwnedQuerysetMixin (filtrage par utilisateur), health check
  accounts/  User personnalisé (identifiant = e-mail), inscription, profil, logout
  goals/     Domain, Goal, Task : models, rules.py (règles métier), serializers, viewsets, tests/
app/       Expo SDK 58 + React Native + TypeScript strict, Expo Router
  src/app/          routes (fichier = écran). (auth) = connexion/inscription, (main) = app connectée
  src/api/          client.ts (fetch + refresh JWT automatique), hooks TanStack Query par ressource
  src/stores/       Zustand (authStore : statut, tokens)
  src/lib/          tokenStorage(.web).ts (SecureStore / localStorage), dates.ts (ISO <-> JJ/MM/AAAA),
                    horizons.ts, params.ts (useNumberParam), navigation.ts (goBack), numbers.ts
  src/theme/        tokens couleurs clair/sombre, espacements, useTheme / useIsWide
  src/components/   composants partagés : Screen, Header, Section, Button, IconButton, TextField, DateField,
                    ChipSelect, Dialog/ConfirmDialog, States, ProgressBar, Badge, TaskRow, QuickAddTask,
                    GoalPicker, GoalTree, GoalForm, DomainForm, AppTabBar
  src/i18n/fr.ts    tous les textes de l'interface
```

### Authentification
- `POST /api/auth/register/` → `{user, access, refresh}` ; `POST /api/auth/token/` (email, password) ; `POST /api/auth/token/refresh/` (rotation + blacklist) ; `POST /api/auth/logout/` (blacklist du refresh) ; `GET/PATCH /api/auth/me/`.
- Frontend : l'access token reste en mémoire, seul le refresh token est persisté. `apiRequest()` rafraîchit une fois sur 401 puis déconnecte si le refresh est rejeté.
- Garde de navigation : effet dans `src/app/_layout.tsx` (`useSegments` + `router.replace`) selon `authStore.status` ; les layouts `(auth)` et `(main)` ne rendent rien tant que le statut ne leur correspond pas.

### Modèle de données et règles (app `goals`)
- `Domain` (name, icon Ionicons, color hex, order) ; `Goal` (domain, parent, horizon `vision|annual|quarterly|monthly`, start/end_date, status `active|paused|achieved|abandoned`, target/current_value, unit) ; `Task` (goal, due_date, planned_date, priority `high|normal|low`, estimated_minutes, status `todo|in_progress|done`, completed_at auto).
- Suppression d'un parent, d'un domaine ou d'un objectif : `SET_NULL` (rien n'est supprimé en cascade, les enfants deviennent racines).
- `goals/rules.py` :
  - `validate_goal` : début ≤ fin, horizon strictement inférieur au parent, dates incluses dans le parent, enfants existants toujours valides après modification ;
  - `ProgressIndex` : progression de tous les objectifs d'un utilisateur en 2 requêtes ; atteint = 1, sinon indicateur current/target plafonné, sinon moyenne de (moyenne des sous-objectifs non abandonnés, ratio de tâches faites), 0 si rien ;
  - `is_late` : objectif actif dont la progression < prorata du temps écoulé − 10 %.
- Les serializers obtiennent l'index via `progress_index(context)`, construit paresseusement une fois par requête, après l'écriture.

### API métier
- `/api/domains/`, `/api/goals/` (filtres `domain`, `horizon`, `status`, `parent`, `root=true`), `/api/tasks/` (filtres `goal`, `status`, `planned_date`, `planned_after`, `planned_before`, `domain`) : CRUD.
- `GET /api/goals/tree/?domain=` : arbre imbriqué avec progression, retard et tâches par nœud.
- `GET /api/tasks/today/` : `{overdue, today, done}`.
- Un goal renvoie `progress`, `is_late`, `ancestors`, `children_count`, `task_counts` ; une tâche renvoie `goal_path` (vision → objectif direct) et `domain`.
- Les FK (`parent`, `domain`, `goal`) n'acceptent que des objets de l'utilisateur (`OwnedPrimaryKeyRelatedField`) → 400 sinon.
- Frontend : hooks dans `src/api/{domains,goals,tasks}.ts`, clés dans `src/api/keys.ts` ; après toute écriture, `invalidatePlanning()` rafraîchit goals/tree/tasks ; la case à cocher d'une tâche est optimiste (`useToggleTask`).

### Navigation responsive
`src/app/(main)/_layout.tsx` utilise `expo-router/js-tabs` avec une barre personnalisée (`AppTabBar`) :
largeur ≥ 768 px → barre latérale avec tous les écrans ; sinon onglets en bas (Aujourd'hui, Semaine, Objectifs, Timeline, Plus). Les listes d'entrées sont dans `src/components/navigation.ts`. Les piles `goals/` (index, new, [id], [id]/edit), `domains/` (new, [id], [id]/edit) et `tasks/[id]` vivent dans les onglets pour garder la barre latérale ; `domains` et `tasks` ne figurent pas dans la barre. Pour revenir en arrière, utiliser `goBack(fallback)` (pas d'historique après un rechargement web).

## Conventions
- Code, noms et commentaires en anglais ; **interface entièrement en français** (chaînes dans `src/i18n/fr.ts`, messages d'erreur API en français).
- TypeScript strict (+ `noUncheckedIndexedAccess`), pas de `any` non justifié. Alias `@/` → `app/src/`.
- Toute vue DRF sur des données utilisateur hérite de `core.mixins.OwnedQuerysetMixin` (le modèle a un champ `user`). Les objets d'autrui renvoient 404.
- Les règles métier (validation des horizons/dates, progression, retard) vivent côté backend et sont testées.
- Chaque écran gère chargement / vide / erreur avec `LoadingState`, `EmptyState`, `ErrorState`.
- Dates échangées en ISO `YYYY-MM-DD` (champ texte `DateField` en JJ/MM/AAAA, les sélecteurs natifs ne marchent pas sur le web). Décimaux reçus en chaîne (`"42.00"`), affichés via `formatDecimal`.
- Pas de `window.confirm`/`alert` : utiliser `ConfirmDialog`.
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
npx expo start --web        # web sur http://localhost:8081 (127.0.0.1:8081 aussi autorisé en CORS : session séparée, pratique pour tester avec un autre compte)
npx expo start              # QR code pour Expo Go
npx tsc --noEmit            # contrôle de types
npx expo lint
npx expo export --platform web   # build web statique dans dist/
```

## Avancement
- [x] Étape 1 : dépôt, auth JWT, navigation et écrans vides, connexion app ↔ API
- [x] Étape 2 : Domaines, Objectifs, Tâches + progression (Aujourd'hui, Arbre, Domaine, Détail, édition de tâche)
- [ ] Étape 3 : Semaine et Timeline
- [ ] Étape 4 : Habitudes et Revues guidées
- [ ] Étape 5 : Statistiques, notifications locales, build APK (EAS) et web
