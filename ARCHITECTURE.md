# Architecture

Private, local-first health web app built on SvelteKit 2, Svelte 5, Bun, SQLite, Vitest, and Playwright.

This file is the implementation-facing map of the live codebase.

Use it when you need to answer:
- where feature logic lives
- how routes talk to feature modules
- where state belongs
- which modules are safe to change together

## System Shape

```text
browser route
  -> src/routes/**/+page.svelte
  -> src/lib/features/<feature>/Page.svelte
  -> client.ts
  -> state.ts / actions.ts / controller.ts / snapshot.ts
  -> core/http/feature-client.ts
  -> /api/* typed RequestHandler
  -> $lib/server/<feature>/service.ts
  -> feature service/state/actions + server mirror/query helpers
```

For local-first flows, the same feature client runs against an injected in-memory test-store facade in test mode.

```text
component / page
  -> feature client
      -> runFeatureMode(...)
          -> test mode: call feature logic with the injected in-memory store facade
          -> app mode: POST JSON to /api/*
```

That is the whole game. One feature, one vertical slice, same contracts in browser and route tests.

## Top-Level Layout

```text
src/
  routes/                 SvelteKit route entrypoints
  lib/
    core/                 shared platform code
      db/                 schema, store contracts, in-memory test facade
      domain/             canonical domain types and time helpers
      http/               local-first feature client helpers
      shared/             reusable domain helpers
      ui/                 app shell and primitives
    features/             feature slices
tests/
  core/                   framework and infrastructure tests
  features/               feature unit/component/e2e tests
  support/                shared test harnesses and fixtures
docs/                     product/design/ops/research source of truth
```

## Route Map

User-facing pages:

- `/today`
- `/plan`
- `/movement`
- `/groceries`
- `/journal`
- `/health`
- `/nutrition`
- `/sobriety`
- `/assessments`
- `/timeline`
- `/review`
- `/imports`
- `/integrations`
- `/settings`

API endpoints:

- `/api/today`
- `/api/plan`
- `/api/movement`
- `/api/movement/search-exercises`
- `/api/groceries`
- `/api/journal`
- `/api/health`
- `/api/nutrition`
- `/api/nutrition/search-usda`
- `/api/nutrition/search-packaged`
- `/api/nutrition/search-recipes`
- `/api/nutrition/barcode/[code]`
- `/api/nutrition/enrich/[fdcId]`
- `/api/sobriety`
- `/api/assessments`
- `/api/timeline`
- `/api/review`
- `/api/imports`
- `/api/integrations`
- `/api/status`
- `/api/db/migrate`
- `/api/test/reset-db`

## Feature Module Conventions

Feature modules are intentionally explicit. Not every feature has every file, but the pattern is stable:

```text
Page.svelte      feature UI shell
client.ts        browser-facing local-first API
state.ts         page state and pure state transitions
actions.ts       mutation orchestration
controller.ts    page-level orchestration when state/actions split is not used
snapshot.ts      read-model assembly for page snapshots
service.ts       domain persistence / computation
model.ts         view-model shaping and small pure helpers
contracts.ts     route payload schema
```

Rules:

- Keep UI behavior in `Page.svelte` and leaf components.
- Keep persistent data logic in `service.ts`, `store.ts`, `snapshot.ts`, or `actions.ts`.
- Keep feature-local orchestration helpers local to the feature.
- Prefer direct imports from the real owner module over pass-through barrels.
- Only add shared helpers when the behavior is genuinely cross-feature domain logic.

## Feature Inventory

### Today

Purpose:
- daily check-in
- planned meal / workout execution
- recovery actions
- event stream for the day

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/today/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/today/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/today/controller.ts)
- [actions.ts](/home/pyro1121/Documents/Health/src/lib/features/today/actions.ts)
- [snapshot.ts](/home/pyro1121/Documents/Health/src/lib/features/today/snapshot.ts)
- [model.ts](/home/pyro1121/Documents/Health/src/lib/features/today/model.ts)

### Plan

Purpose:
- weekly plan slots
- workout-template creation
- grocery derivation surface

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/planning/Page.svelte)
- [state.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/state.ts)
- [actions.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/actions.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/service.ts)
- [model.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/model.ts)
- [contracts.ts](/home/pyro1121/Documents/Health/src/lib/features/planning/contracts.ts)

### Movement

Purpose:
- workout template authoring
- exercise search

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/movement/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/movement/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/movement/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/movement/service.ts)
- [model.ts](/home/pyro1121/Documents/Health/src/lib/features/movement/model.ts)
- [studio-state.ts](/home/pyro1121/Documents/Health/src/lib/features/movement/studio-state.ts)

### Groceries

Purpose:
- derived grocery list from weekly recipes
- manual grocery overlays
- grocery status toggles

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/groceries/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/groceries/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/groceries/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/groceries/service.ts)

### Journal

Purpose:
- daily journal entries
- linked health-event context
- hydration from Today/Review intents

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/journal/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/journal/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/journal/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/journal/service.ts)
- [navigation.ts](/home/pyro1121/Documents/Health/src/lib/features/journal/navigation.ts)

### Health

Purpose:
- manual symptom, anxiety, sleep-note, and template logging

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/health/Page.svelte)
- [state.ts](/home/pyro1121/Documents/Health/src/lib/features/health/state.ts)
- [actions.ts](/home/pyro1121/Documents/Health/src/lib/features/health/actions.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/health/service.ts)

### Nutrition

Purpose:
- food search
- packaged lookup
- recipe search
- meal logging
- recurring meals
- planned meal handoff into Today/Plan

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/nutrition/Page.svelte)
- [state.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/state.ts)
- [actions.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/actions.ts)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/client.ts)
- [store.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/store.ts)
- [lookup.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/lookup.ts)
- [summary.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/summary.ts)
- [types.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/types.ts)
- [planned-meal-resolution.ts](/home/pyro1121/Documents/Health/src/lib/features/nutrition/planned-meal-resolution.ts)

### Sobriety

Purpose:
- sober / recovery status
- craving logging
- lapse context logging

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/sobriety/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/sobriety/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/sobriety/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/sobriety/service.ts)

### Assessments

Purpose:
- PHQ-9 / WHO-5 style assessment flow
- draft save and final submit
- safety messaging

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/assessments/Page.svelte)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/assessments/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/assessments/service.ts)
- [definitions.ts](/home/pyro1121/Documents/Health/src/lib/features/assessments/definitions.ts)

### Timeline

Purpose:
- normalized cross-source event feed

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/timeline/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/timeline/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/timeline/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/timeline/service.ts)

### Review

Purpose:
- weekly synthesis across all feature data
- adherence scoring
- context signals
- experiment persistence

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/review/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/review/client.ts)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/review/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/review/service.ts)
- [analytics.ts](/home/pyro1121/Documents/Health/src/lib/features/review/analytics.ts) and split analytics modules
- [model.ts](/home/pyro1121/Documents/Health/src/lib/features/review/model.ts)

### Imports

Purpose:
- staged import preview and commit
- source inference
- payload validation

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/imports/Page.svelte)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/client.ts)
- [store.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/store.ts)
- [analyze.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/analyze.ts)
- [core.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/core.ts)
- [page-actions.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/page-actions.ts)
- [page-state.ts](/home/pyro1121/Documents/Health/src/lib/features/imports/page-state.ts)

### Integrations

Purpose:
- connector guidance
- shortcut kit downloads
- import handoff

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/integrations/Page.svelte)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/integrations/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/integrations/service.ts)
- [setup-presenters.ts](/home/pyro1121/Documents/Health/src/lib/features/integrations/setup-presenters.ts)
- [downloads.ts](/home/pyro1121/Documents/Health/src/lib/features/integrations/downloads.ts)

### Settings

Purpose:
- owner profile
- local-first posture explanation
- integration setup guidance

Core files:
- [Page.svelte](/home/pyro1121/Documents/Health/src/lib/features/settings/Page.svelte)
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/settings/controller.ts)
- [service.ts](/home/pyro1121/Documents/Health/src/lib/features/settings/service.ts)

## Core Modules

### Database

- [schema.ts](/home/pyro1121/Documents/Health/src/lib/core/db/schema.ts)
- [test-client.ts](/home/pyro1121/Documents/Health/src/lib/core/db/test-client.ts)
- [types.ts](/home/pyro1121/Documents/Health/src/lib/core/db/types.ts)
- server DB mirror under [src/lib/server/db/drizzle](/home/pyro1121/Documents/Health/src/lib/server/db/drizzle)

### Domain

- [types.ts](/home/pyro1121/Documents/Health/src/lib/core/domain/types.ts)
- [time.ts](/home/pyro1121/Documents/Health/src/lib/core/domain/time.ts)
- [validation.ts](/home/pyro1121/Documents/Health/src/lib/core/domain/validation.ts)

### Local-first HTTP

- [feature-client.ts](/home/pyro1121/Documents/Health/src/lib/core/http/feature-client.ts)
- [client.ts](/home/pyro1121/Documents/Health/src/lib/core/http/client.ts)

### Shared domain helpers

- [local-day-page.ts](/home/pyro1121/Documents/Health/src/lib/core/shared/local-day-page.ts)
- [plan-slots.ts](/home/pyro1121/Documents/Health/src/lib/core/shared/plan-slots.ts)
- [records.ts](/home/pyro1121/Documents/Health/src/lib/core/shared/records.ts)
- [health-events.ts](/home/pyro1121/Documents/Health/src/lib/core/shared/health-events.ts)

### UI shell and primitives

- [AppLayout.svelte](/home/pyro1121/Documents/Health/src/lib/core/ui/AppLayout.svelte)
- [route-runtime.ts](/home/pyro1121/Documents/Health/src/lib/core/ui/route-runtime.ts)
- shell components under [core/ui/shell](/home/pyro1121/Documents/Health/src/lib/core/ui/shell)
- primitives under [core/ui/primitives](/home/pyro1121/Documents/Health/src/lib/core/ui/primitives)

## Request / Mutation Flow

```text
Page.svelte
  -> client.ts
  -> feature-client.ts
      -> injected in-memory feature-store logic in tests
      -> /api/* route in app runtime
  -> route handler
  -> feature state/actions/service
  -> server storage or in-memory test tables
  -> optional weekly review refresh
  -> page state reload
```

This repo prefers direct, explicit flows over clever abstraction. Follow that bias.

## Testing Strategy

```text
tests/core/
  framework and infra tests

tests/features/unit/
  feature logic and route/controller/service coverage

tests/features/component/
  route/component harness tests with local DB

tests/features/e2e/
  browser flows through real app behavior
```

Rules:

- Structural cleanup must be backed by targeted unit tests and `bun run check`.
- User-visible flows should have smoke or targeted E2E proof when touched.
- Feature route tests should keep the route contract explicit.

## Documentation Rules

When code structure changes:

- update [README.md](/home/pyro1121/Documents/Health/README.md) if commands or repo map changed
- update [docs/README.md](/home/pyro1121/Documents/Health/docs/README.md) if read order or source-of-truth docs changed
- update this file if feature ownership or module structure changed

If a diagram becomes stale, fix it in the same change.

## Cleanup Rules

Good cleanup in this repo means:

- remove pass-through wrappers that hide true ownership
- extract small local helpers when duplication is real
- add shared helpers only for genuinely shared domain behavior
- keep slices small enough that targeted tests still prove the result

Bad cleanup means:

- broad abstraction passes
- changing component patterns for style only
- deleting structure without replacing it with clearer ownership
- widening a slice after tests are already scoped
