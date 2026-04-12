# Operations Runbook

Status: Active  
Date: 2026-04-10

This file is for operating, verifying, and troubleshooting the app locally and in CI.

Use it when you need to answer:
- how to boot the app
- how to prove it works
- how to reset test data
- what to do when serving or import flows fail

## Local Commands

Development:

```sh
bun install
bun run check
bun run dev
```

Smoke / build / operational verification:

```sh
bun run test:smoke
bun run build
bun run check:operational
```

Unit suite:

```sh
bun run test:unit
```

Component suite:

```sh
bun run test:component
```

E2E:

```sh
bun run test:e2e
```

## What `check:operational` Proves

`bun run check:operational`:
- builds the app
- starts preview
- fetches `/`
- verifies expected document title
- fetches `/api/status`
- verifies the operational payload

This is the best one-command local proof that the app is up.

## Ports And Runtime

Default local expectations:
- dev server: `5173`
- preview server: `4173`

The operational script uses:
- `OPERATIONAL_HOST`
- `OPERATIONAL_PORT`
- `OPERATIONAL_TIMEOUT_MS`

## Playwright Notes

The Playwright config expects preview on `127.0.0.1:4173`.

Typical smoke run:

```sh
bun run test:smoke
```

Targeted E2E examples:

```sh
bun run test:e2e --grep "weekly review surfaces journal context signals"
bun run test:e2e --grep "iphone companion bundle import lands in timeline and review"
```

Use targeted grep runs whenever possible.

## Database Reset And Seeding

Playwright-only reset endpoint:
- `POST /api/test/reset-db`
- requires `x-health-reset-token: codex-e2e`
- only works when Playwright mode flag is enabled

Snapshot seed endpoint:
- `POST /api/db/migrate`
- bulk loads a full `HealthDbSnapshot`

Use those for:
- stable E2E setup
- isolated repros
- route/component seeded tests

## Operational Failure Triage

### App builds but preview feels broken

Run:

```sh
bun run build
bun run test:smoke
bun run check:operational
```

If `check:operational` fails:
- check `/api/status`
- check whether preview exited early
- check whether a route/client import still points at a deleted wrapper

### Import preview or commit shows `Failed to fetch`

Likely suspects:
- stale route/client import edge
- preview/commit route shape drift
- import summary or staged-artifact regression

Proof path:

```sh
bun run test:unit tests/features/unit/imports/store.test.ts tests/features/unit/imports/route.test.ts
bun run test:e2e --grep "iphone companion bundle import lands in timeline and review"
```

### Review output missing after healthy feature writes

Likely suspects:
- mutation path forgot to refresh weekly review artifacts
- anchor day logic picked the wrong week
- derived review snapshot was stale

Proof path:

```sh
bun run test:unit tests/features/unit/review/service.test.ts tests/features/unit/review/controller.test.ts
bun run test:e2e --grep "weekly review surfaces journal context signals"
```

## CI Expectations

Core expected checks:
- Lint
- Type Check
- Dependency Review
- Unit Tests
- Component Tests
- Build
- CI Config
- E2E
- CodeQL

Operationally important advisory automation:
- Grok review
- Grok PR manager
- auto-fix / CI surgeon lanes

See:
- [ci-cd-standards.md](ops/ci-cd-standards.md)
- [ci-workflow-inventory.md](ops/ci-workflow-inventory.md)
- [grok-pr-automation.md](ops/grok-pr-automation.md)

## Cleanup Runbook

For structural cleanup:

1. run the narrowest affected unit tests first
2. run `bun run check`
3. if user flow touched, run smoke or targeted E2E
4. update docs if module structure changed

Bad:
- “refactor a bunch of things” then run a giant suite once at the end

Good:
- slice
- verify
- slice
- verify

## When To Escalate

Escalate instead of continuing when:
- a structural cleanup starts touching too many features at once
- the next slice is no longer based on a concrete smell
- the worktree gets too large to reason about safely
- CI/preview behavior differs from local proof and the cause is unclear
