# Grand Cinéma – application web

Interface de réservation du Grand Cinéma (bloc 3 du Bachelor Développeur d'application Web, Studi) : site public des spectateurs et back-office des agents d'accueil et des administrateurs.
Elle consomme l'API [grand-cinema-api](https://github.com/acoclez/grand-cinema-api).

## Pile technique

- Vue 3 avec TypeScript, Vite, Vue Router, Pinia.
- Qualité : ESLint et oxlint, Prettier, vue-tsc (vérification des types), Vitest (tests et couverture), SonarCloud.
- Intégration continue : GitHub Actions, à chaque merge request vers `develop` et à chaque push sur `develop` et `main`.

## Convention de branches

| Branche | Rôle | Créée depuis | Fusionnée dans |
|---|---|---|---|
| `main` | Version en production, toujours déployable | – | – |
| `develop` | Intégration des fonctionnalités terminées, déployée en préproduction | `main` | `main` (mise en production) |
| `feature/<nom-court>` | Une user story (ex. `feature/plan-de-salle`) | `develop` | `develop` par merge request |
| `fix/<nom-court>` | Correction d'un bug constaté en développement ou en préproduction | `develop` | `develop` par merge request |
| `hotfix/<nom-court>` | Correction urgente en production | `main` | `main` puis `develop` |
| `chore/<nom-court>` | Outillage, dépendances, intégration continue, documentation | `develop` | `develop` par merge request |

Règles :

- Le nom court est en minuscules, en français, les mots séparés par des tirets, et reprend le nom de la branche prévu sur la carte Trello de la user story.
- Aucun commit direct sur `main` ni sur `develop` : tout passe par une merge request relue, avec l'intégration continue au vert.
- Une merge request = une user story (ou une correction). La branche est supprimée après la fusion.
- Message de commit : `type(périmètre): description à l'impératif`, avec `type` parmi `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. Exemple : `feat(seances): afficher les places restantes`.

## Installation locale

```bash
npm install
cp .env.example .env
npm run dev
```

Prérequis : Node 24 ou plus récent, et l'API lancée sur l'adresse indiquée dans `.env`.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types puis construction pour la production |
| `npm run test:unit` | Tests Vitest |
| `npm run test:unit -- --coverage` | Tests avec rapport de couverture |
| `npm run lint` | Vérification du code (oxlint puis ESLint) |
| `npm run format` | Mise en forme avec Prettier |
