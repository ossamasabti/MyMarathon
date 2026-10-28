# MyMarathon — guide pour Claude

Application d'organisation des objectifs dans le temps : chaque tâche du quotidien est reliée à un objectif, lui-même rattaché à un horizon plus long (vision → annuel → trimestriel → mensuel → tâche). Une seule base de code frontend pour le web, Android et iOS.

## Architecture

```
backend/   Django 5.2 + DRF, API REST sous /api/, JWT (simplejwt), argon2
  config/    settings (tout vient de l'environnement / backend/.env), urls racine
  core/      briques partagées : OwnedQuerysetMixin (filtrage par utilisateur), health check
  accounts/  User personnalisé (identifiant = e-mail), inscription, profil, logout
  goals/     Domain, Goal, Task, Habit, HabitLog, Review : models, rules.py (hiérarchie, progression, retard),
             habits.py (échéance, série, taux), periods.py, review_summary.py, stats.py, serializers, viewsets, tests/
app/       Expo SDK 58 + React Native + TypeScript strict, Expo Router
  src/app/          routes (fichier = écran). (auth) = connexion/inscription, (main) = app connectée
  src/api/          client.ts (fetch + refresh JWT automatique), hooks TanStack Query par ressource
  src/stores/       Zustand : authStore (statut, tokens), prefsStore (thème, rappels ; persisté dans AsyncStorage)
  src/lib/          tokenStorage(.web).ts (SecureStore / localStorage), dates.ts (ISO <-> JJ/MM/AAAA),
                    horizons.ts, params.ts (useNumberParam), navigation.ts (goBack), numbers.ts,
                    calendar.ts (semaine lundi→dimanche, géométrie de la frise, périodes de revue),
                    reviewQuestions.ts (questions par type de revue, clés stables), reminders.ts (planification
                    pure des rappels), notifications(.web).ts (expo-notifications / sans effet sur le web)
  src/theme/        tokens couleurs clair/sombre, espacements, chartColors, useTheme / useIsWide,
                    domainColors.ts (palette catégorielle validée des domaines + variante sombre)
  src/components/   composants partagés : Screen, Header, Section, Button, IconButton, TextField, DateField,
                    ChipSelect, Dialog/ConfirmDialog, States, ProgressBar, Badge, TaskRow, QuickAddTask,
                    GoalPicker, GoalTree, GoalForm, DomainForm, MoveTaskDialog, Timeline, HabitRow, HabitForm,
                    HabitHistory, DayPicker, StatTile, WeeklyColumns, NotificationsSync, AppTabBar
  src/i18n/fr.ts    tous les textes de l'interface
```

### Authentification
- `POST /api/auth/register/` → `{user, access, refresh}` ; `POST /api/auth/token/` (email, password) ; `POST /api/auth/token/refresh/` (rotation + blacklist) ; `POST /api/auth/logout/` (blacklist du refresh) ; `GET/PATCH /api/auth/me/`.
- Frontend : l'access token reste en mémoire, seul le refresh token est persisté. `apiRequest()` rafraîchit une fois sur 401 puis déconnecte si le refresh est rejeté (400/401 uniquement ; une panne réseau ou serveur garde la session).
- `accounts.serializers.SafeTokenRefreshSerializer` (réglage `TOKEN_REFRESH_SERIALIZER`) : renvoie 401 au lieu d'une 500 quand l'utilisateur du token a été supprimé.
- Garde de navigation : effet dans `src/app/_layout.tsx` (`useSegments` + `router.replace`) selon `authStore.status` ; les layouts `(auth)` et `(main)` ne rendent rien tant que le statut ne leur correspond pas.

### Modèle de données et règles (app `goals`)
- `Domain` (name, icon Ionicons, color hex, order) ; `Goal` (domain, parent, horizon `vision|annual|quarterly|monthly`, start/end_date, status `active|paused|achieved|abandoned`, target/current_value, unit) ; `Task` (goal, due_date, planned_date, priority `high|normal|low`, estimated_minutes, status `todo|in_progress|done`, completed_at auto).
- Suppression d'un parent, d'un domaine ou d'un objectif : `SET_NULL` (rien n'est supprimé en cascade, les enfants deviennent racines).
- `goals/rules.py` :
  - `validate_goal` : début ≤ fin, horizon strictement inférieur au parent, dates incluses dans le parent, enfants existants toujours valides après modification ;
  - `ProgressIndex` : progression de tous les objectifs d'un utilisateur en 2 requêtes ; atteint = 1, sinon indicateur current/target plafonné, sinon moyenne de (moyenne des sous-objectifs non abandonnés, ratio de tâches faites), 0 si rien ;
  - `is_late` : objectif actif dont la progression < prorata du temps écoulé − 10 %.
- Les serializers obtiennent l'index via `progress_index(context)`, construit paresseusement une fois par requête, après l'écriture.

### Habitudes et revues
- `Habit` (goal obligatoire à la création, `SET_NULL` en base ; frequency `daily|weekly` ; days 0=lundi…6, vide = tous les jours pour une quotidienne) et `HabitLog` (unique habit+date).
- `habits.py` : `is_due` (une hebdomadaire n'est plus due une fois faite dans la semaine), `streak` (aujourd'hui non coché ne casse pas la série ; en semaines pour une hebdomadaire), `completion` (jours futurs exclus), `tracking_start` (création ou premier jour rattrapé : les taux ne comptent pas les jours d'avant).
- Les habitudes n'entrent pas dans la progression des objectifs (règle du cahier des charges).
- `Review` : une par (user, type, period_start) ; `period_start` doit être le début exact (lundi, 1er du mois, 1er du trimestre) ; `period_end` calculé. `Goal.achieved_at` (auto, comme `Task.completed_at`) sert au résumé.
- `review_summary.build_summary` : tâches terminées, objectifs qui ont avancé (via eux-mêmes ou un descendant), objectifs atteints dans la période, taux des habitudes, objectifs en retard.
- Front : `/review` (hub : type, période, historique) → `/review/[type]/[start]` (résumé + questions de `reviewQuestions.ts`, `start` normalisé au début de période) ; `/habits/[id]` (historique 4 semaines cochable pour rattraper, édition, suppression).

### Statistiques, rappels, réglages, builds
- `GET /api/stats/?weeks=12` (`goals/stats.py`) : progression moyenne des objectifs racines de chaque domaine, tâches terminées par semaine (semaines vides à 0), objectifs en retard (réel vs attendu), totaux sur 30 jours.
- Graphiques en `View` (pas de lib) selon le skill dataviz : barres ≤ 24 px, bout arrondi 4 px côté données, valeurs en couleur de texte, une seule série = pas de légende, lecture au survol/appui + tableau « Voir les données ».
- Couleurs de domaine : la palette `DOMAIN_PALETTE` a été validée (`validate_palette.js`, clair et sombre) ; l'API stocke la teinte claire, l'affichage passe par `useDomainColor()` / `DomainDot` / `ProgressBar`. Ne pas ajouter de couleur hors palette. Migration `0003_domain_palette` = conversion des anciennes couleurs.
- Rappels locaux : `NotificationsSync` (monté dans `(main)/_layout.tsx`) recalcule au démarrage, au retour au premier plan et quand tâches/objectifs changent. Échéances à 9 h (tâches à J, objectifs à J−3, 14 jours, max 50) ; revue le dimanche 18 h (weekday expo : 1 = dimanche). Rien sur le web. Annulés à la déconnexion.
- Thème : `prefsStore.theme` (`system|light|dark`) lu par `useColorSchemeName()`.
- `app.config.ts` (remplace app.json) : HTTP non chiffré autorisé seulement pour `EAS_BUILD_PROFILE=preview`. `eas.json` : `preview` = APK vers `http://192.168.1.31:8000` (IP Wi-Fi du PC), `production` = AAB avec une URL HTTPS à définir.
- Production backend : réglages de sécurité activés quand `DEBUG=False` (HSTS optionnel via `SECURE_HSTS_SECONDS`), `gunicorn` dans requirements.

### API métier
- `/api/domains/`, `/api/goals/` (filtres `domain`, `horizon`, `status`, `parent`, `root=true`, `active_from`/`active_to` = chevauchement d'une période), `/api/tasks/` (filtres `goal`, `status`, `planned_date`, `planned_after`, `planned_before`, `unplanned=true`, `domain`) : CRUD.
- `GET /api/goals/tree/?domain=` : arbre imbriqué avec progression, retard et tâches par nœud.
- `GET /api/tasks/today/` : `{overdue, today, done}`.
- Tâches : filtres `due_after` / `due_before` (rappels).
- `/api/habits/` (filtre `goal`) + `GET today/`, `POST {id}/check/` `{date?, done}` (date future refusée), `GET {id}/logs/?from=&to=` ; `/api/reviews/` (filtres `type`, `period_start`) + `GET summary/?type=&period_start=`.
- Un goal renvoie `progress`, `is_late`, `ancestors`, `children_count`, `task_counts` ; une tâche renvoie `goal_path` (vision → objectif direct) et `domain`.
- Les FK (`parent`, `domain`, `goal`) n'acceptent que des objets de l'utilisateur (`OwnedPrimaryKeyRelatedField`) → 400 sinon.
- Frontend : hooks dans `src/api/{domains,goals,tasks}.ts`, clés dans `src/api/keys.ts` ; après toute écriture, `invalidatePlanning()` rafraîchit goals/tree/tasks ; la case à cocher d'une tâche est optimiste (`useToggleTask`).

### Semaine et Timeline
- Semaine (`(main)/week.tsx`) : semaine dans l'URL (`?start=`, normalisée au lundi). Sur grand écran, 7 colonnes dont la largeur est calculée par `onLayout` (min 210 px, sinon défilement horizontal) ; sur mobile, liste des jours. Déplacement par `MoveTaskDialog` ou flèches ±1 jour (`useMoveTask`, optimiste) ; panneau « À planifier » (`unplanned=true`). Pas de glisser-déposer (dépendances natives, comportement web différent).
- Timeline (`(main)/timeline.tsx` + `components/Timeline.tsx`) : année dans l'URL (`?year=`), objectifs chargés avec `active_from/active_to`, `View` positionnées en % (pas de lib graphique). Piste mesurée par `onLayout`, min 720 px, défilement horizontal en dessous ; colonne des titres fixe. Barre = teinte du domaine, remplissage = progression, pointillés = en retard, chevrons = recadrée sur l'année.
- Éviter `flex: 1` pour dimensionner des enfants dans un `ScrollView` horizontal (comportement différent sur le web) : mesurer avec `onLayout`.
- Pour une plage de dates, utiliser `formatRange` (affiche les années dès qu'une date sort de l'année courante).

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
npx expo start --web        # web sur http://localhost:8081 (127.0.0.1:8081 et 192.168.1.31:8081 aussi autorisés en CORS local : sessions séparées, pratiques pour tester avec un compte jetable sans toucher à celui de l'utilisateur)
npx expo start              # QR code pour Expo Go
npx tsc --noEmit            # contrôle de types
npx expo lint
npx expo export --platform web   # build web statique dans dist/
```

## Avancement
- [x] Étape 1 : dépôt, auth JWT, navigation et écrans vides, connexion app ↔ API
- [x] Étape 2 : Domaines, Objectifs, Tâches + progression (Aujourd'hui, Arbre, Domaine, Détail, édition de tâche)
- [x] Étape 3 : Semaine et Timeline
- [x] Étape 4 : Habitudes et Revues guidées
- [x] Étape 5 : Statistiques, notifications locales, configuration EAS (APK) et build web
