# Feature Reference

Status: Active  
Date: 2026-04-10

This is the fast lookup map for the live feature set.

If you ask “where does this live?” this file should answer in under 30 seconds.

## Feature Matrix

| Feature      | Page Route      | Primary UI                 | Client                   | Core Logic                                                                                                        | Main API            |
| ------------ | --------------- | -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| Overview     | `/`             | `overview/Page.svelte`     | —                        | shell metadata                                                                                                    | —                   |
| Today        | `/today`        | `today/Page.svelte`        | `today/client.ts`        | `today/controller.ts`, `today/actions.ts`, `today/snapshot.ts`                                                    | `/api/today`        |
| Plan         | `/plan`         | `planning/Page.svelte`     | `planning/client.ts`     | `planning/state.ts`, `planning/actions.ts`, `planning/service.ts`                                                 | `/api/plan`         |
| Movement     | `/movement`     | `movement/Page.svelte`     | `movement/client.ts`     | `movement/controller.ts`, `movement/service.ts`                                                                   | `/api/movement`     |
| Groceries    | `/groceries`    | `groceries/Page.svelte`    | `groceries/client.ts`    | `groceries/controller.ts`, `groceries/service.ts`                                                                 | `/api/groceries`    |
| Journal      | `/journal`      | `journal/Page.svelte`      | `journal/client.ts`      | `journal/controller.ts`, `journal/service.ts`                                                                     | `/api/journal`      |
| Health       | `/health`       | `health/Page.svelte`       | `health/client.ts`       | `health/state.ts`, `health/actions.ts`, `health/service.ts`                                                       | `/api/health`       |
| Nutrition    | `/nutrition`    | `nutrition/Page.svelte`    | `nutrition/client.ts`    | `nutrition/state.ts`, `nutrition/actions.ts`, `nutrition/store.ts`, `nutrition/lookup.ts`, `nutrition/summary.ts` | `/api/nutrition`    |
| Sobriety     | `/sobriety`     | `sobriety/Page.svelte`     | `sobriety/client.ts`     | `sobriety/controller.ts`, `sobriety/service.ts`                                                                   | `/api/sobriety`     |
| Assessments  | `/assessments`  | `assessments/Page.svelte`  | `assessments/client.ts`  | `assessments/controller.ts`, `assessments/service.ts`                                                             | `/api/assessments`  |
| Timeline     | `/timeline`     | `timeline/Page.svelte`     | `timeline/client.ts`     | `timeline/controller.ts`, `timeline/service.ts`                                                                   | `/api/timeline`     |
| Review       | `/review`       | `review/Page.svelte`       | `review/client.ts`       | `review/controller.ts`, `review/service.ts`, analytics modules                                                    | `/api/review`       |
| Imports      | `/imports`      | `imports/Page.svelte`      | `imports/client.ts`      | `imports/store.ts`, `imports/analyze.ts`, `imports/page-actions.ts`, `imports/page-state.ts`                      | `/api/imports`      |
| Integrations | `/integrations` | `integrations/Page.svelte` | `integrations/client.ts` | `integrations/controller.ts`, `integrations/service.ts`                                                           | `/api/integrations` |
| Settings     | `/settings`     | `settings/Page.svelte`     | —                        | `settings/controller.ts`, `settings/service.ts`                                                                   | —                   |

## Shared Core Modules

| Area           | Files                  | Purpose                                                          |
| -------------- | ---------------------- | ---------------------------------------------------------------- |
| DB             | `core/db/*`            | schema, client, typed DB contracts                               |
| Domain         | `core/domain/*`        | canonical domain types and time helpers                          |
| HTTP           | `core/http/*`          | local-first feature client boundary                              |
| Shared helpers | `core/shared/*`        | reusable domain helpers like records, local-day-page, plan-slots |
| UI shell       | `core/ui/shell/*`      | app shell, nav, route headers                                    |
| UI primitives  | `core/ui/primitives/*` | low-level presentational building blocks                         |

## Route Handler Styles

| Pattern                       | Used By                    | Meaning                                                 |
| ----------------------------- | -------------------------- | ------------------------------------------------------- |
| direct typed `RequestHandler` | all active `/api/*` routes | schema validation plus explicit server-service dispatch |
| plain `GET`                   | `/api/status`              | operational health                                      |

## Review Refresh Dependencies

These feature areas can affect weekly review output:

- today
- journal
- health
- nutrition
- planning
- groceries
- sobriety
- assessments
- imports

If a cleanup touches one of those mutation paths, add review regressions or at least review-adjacent verification.

## File Ownership Shortcuts

If you need to:

- change page state shape:
  - start in `state.ts` or `controller.ts`
- change mutation flow:
  - start in `actions.ts` or `controller.ts`
- change persistence/query logic:
  - start in `service.ts`, `store.ts`, `lookup.ts`, or `summary.ts`
- change request schema:
  - start in `contracts.ts`
- change route wiring:
  - start in `src/routes/api/**/+server.ts`

## Verification Shortcuts

Structural cleanup:

```sh
bun run check
bun run test:unit <targeted tests>
```

User-visible flow:

```sh
bun run test:smoke
bun run test:e2e --grep "<flow>"
```

Operational proof:

```sh
bun run check:operational
```

## Documentation Rule

If any row in this file changes, update:

- this file
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [docs/README.md](README.md)
