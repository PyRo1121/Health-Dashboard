# API Reference

Status: Active  
Date: 2026-04-10

This file documents the live SvelteKit route handlers in `src/routes/api`.

Use it to answer:

- which endpoint owns which feature flow
- whether a route is page-state based or query based
- which feature module backs the route
- which routes are operational or test-only

## Design Rules

- Feature routes use direct typed `RequestHandler` exports.
- Request payloads are validated with feature-local `contracts.ts` schemas or route-local `zod` schemas.
- Route handlers dispatch to `$lib/server/<feature>/service.ts` rather than generic wrapper helpers.
- Page-state routes still round-trip typed page state objects, but the runtime owner is the server service layer.

## Core Flow

```text
browser client
  -> feature client.ts
  -> /api/* typed RequestHandler
  -> $lib/server/<feature>/service.ts
  -> feature actions/state/controller/service + Bun SQLite/Drizzle mirror
  -> typed JSON response
```

## Operational Routes

### `GET /api/status`

Purpose:

- operational health probe for local preview verification

Handler:

- [src/routes/api/status/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/status/+server.ts)

Response:

```json
{ "ok": true, "service": "personal-health-cockpit" }
```

### `POST /api/db/migrate`

Purpose:

- seed/import a full database snapshot for tests and controlled local migration flows

Handler:

- [src/routes/api/db/migrate/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/db/migrate/+server.ts)

Notes:

- bulk loads all major table families
- used heavily by tests and seeded repro scenarios

### `POST /api/test/reset-db`

Purpose:

- Playwright-only database reset endpoint

Handler:

- [src/routes/api/test/reset-db/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/test/reset-db/+server.ts)

Guardrails:

- only available when Playwright mode flag exists
- requires `x-health-reset-token: codex-e2e`

## Feature Routes

### Today

Route:

- `POST /api/today`

Handler:

- [src/routes/api/today/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/today/+server.ts)

Backed by:

- [src/lib/server/today/service.ts](/home/pyro1121/Documents/Health/src/lib/server/today/service.ts)

Actions:

- `load`
- `save`
- `logPlannedMeal`
- `clearPlannedMeal`
- `applyRecoveryAction`
- `markPlanSlotStatus`

### Plan

Route:

- `POST /api/plan`

Handler:

- [src/routes/api/plan/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/plan/+server.ts)

Backed by:

- [src/lib/features/planning/state.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/state.ts)
- [src/lib/features/planning/actions.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/actions.ts)

Actions:

- `load`
- `saveSlot`
- `saveWorkoutTemplate`
- `markSlotStatus`
- `moveSlot`
- `deleteSlot`
- `toggleGrocery`
- `addManualGrocery`
- `removeManualGrocery`

### Movement

Routes:

- `POST /api/movement`
- `POST /api/movement/search-exercises`

Handlers:

- [src/routes/api/movement/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/movement/+server.ts)
- [src/routes/api/movement/search-exercises/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/movement/search-exercises/+server.ts)

Backed by:

- [src/lib/server/movement/service.ts](/home/pyro1121/Documents/Health/src/lib/server/movement/service.ts)
- [src/lib/features/movement/service.ts](/home/pyro1121/Documents/Health/src/lib/features/movement/service.ts)

### Groceries

Route:

- `POST /api/groceries`

Handler:

- [src/routes/api/groceries/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/groceries/+server.ts)

Backed by:

- [src/lib/server/groceries/service.ts](/home/pyro1121/Documents/Health/src/lib/server/groceries/service.ts)

Actions:

- `load`
- `toggle`
- `addManual`
- `removeManual`

### Journal

Route:

- `POST /api/journal`

Handler:

- [src/routes/api/journal/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/journal/+server.ts)

Backed by:

- [src/lib/server/journal/service.ts](/home/pyro1121/Documents/Health/src/lib/server/journal/service.ts)

Actions:

- `load`
- `hydrateIntent`
- `save`
- `delete`

### Health

Route:

- `POST /api/health`

Handler:

- [src/routes/api/health/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/health/+server.ts)

Backed by:

- [src/lib/server/health/service.ts](/home/pyro1121/Documents/Health/src/lib/server/health/service.ts)
- [src/lib/features/health/state.ts](/home/pyro1121/Documents/Health/src/lib/features/health/state.ts)
- [src/lib/features/health/actions.ts](/home/pyro1121/Documents/Health/src/lib/features/health/actions.ts)

Actions:

- `load`
- `saveSymptom`
- `saveAnxiety`
- `saveSleepNote`
- `saveTemplate`
- `quickLogTemplate`

### Nutrition

Routes:

- `POST /api/nutrition`
- `POST /api/nutrition/search-usda`
- `POST /api/nutrition/search-packaged`
- `POST /api/nutrition/search-recipes`
- `POST /api/nutrition/barcode/[code]`
- `POST /api/nutrition/enrich/[fdcId]`

Handlers:

- [src/routes/api/nutrition/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/nutrition/+server.ts)
- [src/routes/api/nutrition/search-usda/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/nutrition/search-usda/+server.ts)
- [src/routes/api/nutrition/search-packaged/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/nutrition/search-packaged/+server.ts)
- [src/routes/api/nutrition/search-recipes/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/nutrition/search-recipes/+server.ts)
- [src/routes/api/nutrition/barcode/[code]/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/nutrition/barcode/[code]/+server.ts)
- [src/routes/api/nutrition/enrich/[fdcId]/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/nutrition/enrich/[fdcId]/+server.ts)

Backed by:

- [src/lib/server/nutrition/service.ts](/home/pyro1121/Documents/Health/src/lib/server/nutrition/service.ts)
- [src/lib/features/nutrition/state.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/state.ts)
- [src/lib/features/nutrition/actions.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/actions.ts)
- [src/lib/features/nutrition/store.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/store.ts)
- [src/lib/features/nutrition/lookup.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/lookup.ts)
- [src/lib/features/nutrition/summary.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/summary.ts)

Primary page-state actions:

- `load`
- `saveMeal`
- `planMeal`
- `saveRecurringMeal`
- `saveCatalogItem`
- `clearPlannedMeal`
- `reuseMeal`

### Sobriety

Route:

- `POST /api/sobriety`

Handler:

- [src/routes/api/sobriety/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/sobriety/+server.ts)

Backed by:

- [src/lib/server/sobriety/service.ts](/home/pyro1121/Documents/Health/src/lib/server/sobriety/service.ts)

Actions:

- `load`
- `markStatus`
- `saveCraving`
- `saveLapse`

### Assessments

Route:

- `POST /api/assessments`

Handler:

- [src/routes/api/assessments/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/assessments/+server.ts)

Backed by:

- [src/lib/server/assessments/service.ts](/home/pyro1121/Documents/Health/src/lib/server/assessments/service.ts)

Actions:

- `load`
- `saveProgress`
- `submit`

### Timeline

Route:

- `POST /api/timeline`

Handler:

- [src/routes/api/timeline/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/timeline/+server.ts)

Backed by:

- [src/lib/server/timeline/service.ts](/home/pyro1121/Documents/Health/src/lib/server/timeline/service.ts)

Actions:

- `load`

### Review

Route:

- `POST /api/review`

Handler:

- [src/routes/api/review/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/review/+server.ts)

Backed by:

- [src/lib/server/review/service.ts](/home/pyro1121/Documents/Health/src/lib/server/review/service.ts)
- [src/lib/features/review/service.ts](/home/pyro1121/Documents/Health/src/lib/features/review/service.ts)

Actions:

- `load`
- `saveExperiment`

### Imports

Route:

- `POST /api/imports`

Handler:

- [src/routes/api/imports/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/imports/+server.ts)

Backed by:

- [src/lib/features/imports/store.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/store.ts)
- [src/lib/features/imports/analyze.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/analyze.ts)

Actions:

- `list`
- `preview`
- `commit`

### Integrations

Route:

- `POST /api/integrations`

Handler:

- [src/routes/api/integrations/+server.ts](/home/pyro1121/Documents/Health/src/routes/api/integrations/+server.ts)

Backed by:

- [src/lib/server/integrations/service.ts](/home/pyro1121/Documents/Health/src/lib/server/integrations/service.ts)

Actions:

- `load`

## Error Handling Conventions

- feature action routes usually return `400` on invalid payload
- external lookup/enrich routes return:
  - `400` for invalid params
  - `503` for missing config like USDA keys
  - `500` for upstream or normalization failure

## Testing Notes

For route changes:

- add or update route unit tests under `tests/features/unit/*/route.test.ts`

For structural cleanup:

- keep route behavior stable
- prefer import rewiring and local helpers over request-shape changes

## Documentation Rule

If you change:

- endpoint name
- action name
- request schema
- backing feature owner

then update this file in the same tranche.
