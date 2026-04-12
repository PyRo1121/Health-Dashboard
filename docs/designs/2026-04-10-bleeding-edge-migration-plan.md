# Bleeding-Edge Migration Plan

Historical note: this document is preserved as a planning/review record. Code paths, file references, and architecture details inside may be stale; use `ARCHITECTURE.md` and the living docs under `docs/` for current implementation truth.

Status: Historical (Implemented)
Date: 2026-04-10
Branch: `fix/grok-pr-enhancements`
Superseded by: `ARCHITECTURE.md`, `docs/api-reference.md`, `docs/data-model.md`, `docs/feature-reference.md`
Review basis:

- `docs/designs/2026-04-10-bleeding-edge-health-fitness-eng-review.md`
- `ARCHITECTURE.md`
- `docs/data-model.md`
- `docs/feature-flows.md`
- `docs/external-data-sources.md`

## Goal

Migrate the Personal Health Cockpit from a half-migrated local stack into a clear, modern, health-first architecture that can support:

- broader health and fitness ingestion
- stable local persistence
- optional future native companion lanes if usage justifies them
- richer review and today adaptations
- full test coverage for the expanded health graph

This is not a rewrite.

It is a staged migration.

## Product outcome

When this plan is done, the user should be able to:

1. capture manual health truth quickly
2. import richer device and clinical data through the web app
3. see that data land in one canonical timeline
4. get useful Today and Review guidance from it
5. trust that duplicate imports, bad identity matches, and timezone skew do not silently corrupt the story

## What already exists

These are real assets. Reuse them.

- manual health logging, templates, and sleep context in `src/lib/features/health/`
- movement templates and exercise search in `src/lib/features/movement/`
- import preview/staging/commit in `src/lib/features/imports/store.ts`
- weekly review synthesis in `src/lib/features/review/service.ts`
- timeline truth surface in `src/lib/features/timeline/service.ts`
- iOS companion proof of concept in `apps/ios-companion/` (deferred, not part of the current migration)
- SMART sandbox import and owner identity gate in `src/lib/features/imports/store.ts`
- broad unit/component/e2e coverage across health, imports, review, today, planning, and integrations in `tests/features/`

## Step 0 findings

### Current architecture in one diagram

```text
Svelte pages
  -> feature client
  -> /api/* route
  -> controller / state / actions / service
  -> HealthDatabase abstraction
      -> browser test path: Dexie
      -> runtime path: Bun SQLite
  -> review snapshots / timeline / today projections
```

### Core problem

The product direction is strong.

The architecture is in the awkward middle:

- runtime target is still ambiguous
- persistence is abstracted across two backends even though live runtime already prefers server SQLite
- health metrics are too stringly and too narrow for the next phase
- review and timeline are fine at current scale, not future scale

### Migration principle

Do the minimum migration that unlocks the full health graph.

That means:

- no framework rewrite
- no speculative cloud sync first
- no one-page-per-metric explosion
- no direct wearable API spree before aggregator lanes are solid

## Proposed target architecture

```text
SvelteKit 2 + Svelte 5 UI
  -> explicit Bun runtime target
  -> typed server boundary
  -> Drizzle + Bun SQLite canonical local store
  -> typed health metric registry
  -> import normalization
  -> weekly review and today projections

Ingress lanes
  -> manual capture
  -> Apple Health XML import
  -> Day One import
  -> SMART on FHIR clinical import
  -> future native companions only if needed

Truth surfaces
  -> Timeline
  -> Today
  -> Review
```

## Locked recommendations unless you reject them

### 1. Framework and frontend

Keep:

- SvelteKit 2
- Svelte 5 runes
- Bits UI
- Zod
- Vitest
- Playwright
- Bun

Why:

- this is already modern
- the codebase is aligned to it
- replacing it now spends innovation tokens with low user payoff

### 2. Runtime

Replace `adapter-auto` with an explicit Bun-compatible deployment target.

Why:

- `src/lib/server/db/client.ts` already imports `bun:sqlite`
- the app is not actually deployment-agnostic anymore

### 3. Persistence

Make Bun SQLite canonical.

Then migrate the storage layer to Drizzle.

Keep Dexie only as:

- legacy migration source
- browser-side export/import helper if needed
- test helper if it still buys us something temporarily

### 4. Health graph

Introduce a typed metric registry before expanding connectors.

The registry should define, for each metric:

- metric key
- category
- unit semantics
- source support
- timeline label
- health-page participation
- today participation
- review participation
- aggregation rules

### 5. Native companions

Defer native companions until there is an actual iOS or Android usage need.

Keep the import and metric registry contracts future-ready so this lane can be added later without redoing the health graph.

Do not start with Garmin, WHOOP, Oura, Fitbit, or Withings direct APIs.

### 6. Clinical data

Keep SMART on FHIR as the clinical lane.

Read-only first.

Identity-gated first.

No provider write-back.

## Migration phases

## Phase 1: Lock runtime and data-plane direction

Outcome:

- one explicit runtime target
- one explicit canonical persistence story
- migration document accepted
- Phase 1 executes as one tightly coupled migration wave

Work:

- replace `adapter-auto`
- introduce Drizzle schema and queries as the new canonical data layer
- remove the existing `HealthDatabase` abstraction in the first migration wave
- refactor feature code directly onto Drizzle-backed queries and service boundaries
- keep this as one coordinated migration wave rather than separate subphases

Modules touched:

- `svelte.config.js`
- `package.json`
- `src/lib/server/db/`
- `src/lib/core/db/`

Verification:

- `bun run check`
- `bun run build`
- `bun run test:unit`
- `bun run test:e2e --grep "imports|health|today|review"`

## Phase 2: Introduce the typed metric registry

Outcome:

- every imported or manual metric is defined explicitly
- page surfacing logic stops using ad hoc strings

Work:

- add one typed health metric registry module
- define labels, unit semantics, source support, and surfacing rules in that registry
- refactor normalization and display helpers to use it
- refactor health/timeline/review/today gates to use registry metadata

First metric expansion set:

- HRV
- active energy
- workouts
- distance
- VO2 max
- weight
- body fat
- blood pressure
- blood glucose
- SpO2
- temperature

Modules touched:

- `src/lib/core/domain/`
- `src/lib/features/integrations/`
- `src/lib/features/health/`
- `src/lib/features/today/`
- `src/lib/features/review/`
- `src/lib/features/timeline/`

Verification:

- new metric registry unit tests
- review/today/timeline unit tests for representative new metrics
- full review-module rewrite onto Drizzle-first boundaries in the same migration wave

## Phase 3: Scale review, timeline, and dedupe

Outcome:

- broader health history stays fast and trustworthy

Work:

- remove full-table scans from review/timeline paths where possible
- add pagination or bounded queries to timeline
- batch dedupe by source record IDs instead of per-event lookup
- fully rewrite the import subsystem around explicit ingestion stages
- introduce pre-aggregated daily summaries where helpful

Modules touched:

- `src/lib/features/review/`
- `src/lib/features/timeline/`
- `src/lib/features/imports/`
- `src/lib/server/db/`

Verification:

- high-volume unit tests
- import scale tests
- targeted e2e checks for timeline/review latency-sensitive flows

## Phase 4: Harden clinical imports

Outcome:

- clinical import is trustworthy enough for real use

Work:

- keep owner profile identity gate
- harden patient-match logic
- make provenance visible in timeline/review
- keep clinical records read-only

Modules touched:

- `src/lib/features/imports/`
- `src/lib/features/integrations/identity/`
- `src/lib/features/timeline/`
- `src/lib/features/review/`
- `src/lib/features/settings/`

Verification:

- exact-match / mismatch / partial-match tests
- e2e clinical identity gate tests

## Architecture issues to lock

### Issue 1

Runtime target.

Question:

Should this app commit to a Bun-native deployment path now, or should we keep pretending it is host-agnostic while it uses `bun:sqlite` already?

Recommendation:

- commit now

Default recommendation if accepted:

- explicit Bun target in this migration plan

### Issue 2

Canonical local store.

Question:

Should we collapse onto Bun SQLite now, or invest in a bigger migration to PGlite while the product graph is still moving?

Recommendation:

- collapse onto Bun SQLite now, revisit PGlite only if we later need browser-native SQL symmetry or Electric-style sync

Default recommendation if accepted:

- Bun SQLite + Drizzle canonical

### Issue 3

Companion scope.

Decision:

Deferred. Native companions are not part of the current migration because you do not use iOS or Android right now.

Accepted posture:

- keep the import and metric contracts future-ready
- do not spend current migration effort on companion apps

### Issue 4

Migration cut strategy.

Decision:

Accepted. Remove the `HealthDatabase` abstraction in the first migration wave instead of keeping a temporary compatibility shell.

Accepted posture:

- Drizzle-backed queries become the real service boundary early
- tests carry the regression risk instead of a long-lived adapter layer

### Issue 5

Metric model strategy.

Decision:

Accepted. Introduce one typed metric registry now instead of letting imported health and fitness metrics stay as open strings.

Accepted posture:

- one registry owns labels, units, source support, and surfacing rules
- Health, Timeline, Today, and Review consume registry metadata instead of per-feature ad hoc gates

### Issue 7

Review module strategy.

Decision:

Accepted. Rewrite the review module around Drizzle-first boundaries in the same migration wave instead of preserving the current service shape.

Accepted posture:

- review data loading and review assembly can be redesigned together
- the user-facing review behavior still needs regression coverage during the rewrite

### Issue 8

Import subsystem strategy.

Decision:

Accepted. Rewrite the import subsystem in the migration wave instead of just porting the current store module onto Drizzle.

Accepted posture:

- imports can be restructured around explicit ingestion stages
- import UX stays stable, but internal pipeline boundaries can change completely
- regression coverage carries the trust risk during the rewrite

### Issue 9

Regression strategy.

Decision:

Accepted. Add a pre-migration golden regression harness with seeded fixtures for imports, review, today, and timeline before the rewrite lands.

Accepted posture:

- current user-visible behavior gets locked before storage, review, and import rewrites
- rewritten paths must prove parity on seeded datasets, not just pass happy-path e2e tests

## Code-path test plan

```text
CODE PATH COVERAGE
===========================
[+] Runtime migration
    ├── explicit adapter selection
    ├── server DB boot path
    ├── migration from current SQLite wrapper to Drizzle-backed queries
    └── backward compatibility with existing local data

[+] Health graph expansion
    ├── metric registry validation
    ├── manual health events still render correctly
    ├── imported metrics normalize correctly
    ├── today/review/timeline use registry metadata
    └── unknown metrics fail loudly with warnings

[+] Import expansion
    ├── broader Apple Health XML metric normalization
    ├── duplicate import detection
    ├── timezone-localDay assignment
    ├── clinical identity gate behavior
    └── partial or malformed payload behavior

[+] Clinical hardening
    ├── owner profile required
    ├── exact match succeeds
    ├── mismatch blocks import
    └── provenance survives through review/timeline
```

### Required tests

Pre-migration golden regression harness:

- seeded fixtures for imports, review, today, and timeline
- assert current user-visible outputs before the rewrite
- require rewritten Drizzle stack to match those outputs for current supported flows

Unit:

- metric registry contract tests
- storage migration tests
- dedupe batch tests
- patient identity tests
- review aggregation tests on high-volume data
- timeline pagination/filter tests
- golden fixture parity tests for current review and import outputs

Component:

- health page with mixed manual + imported metrics
- imports page error states for expanded bundles
- review page fitness highlight sections
- timeline page parity on seeded migrated datasets

E2E:

- migrated legacy dataset still renders the same key screens
- expanded Apple Health XML import flow
- duplicate import warning flow
- malformed payload recovery flow
- clinical mismatch block flow
- today adapts based on imported biometrics
- review shows broader health highlights and correlations

## Performance targets

These are target numbers for local development and local-first usage. They are plan goals, not measured current-state claims.

- weekly review generation on a dataset with 50,000 health events: under 500ms
- timeline first-page load of 100 rows from a dataset with 100,000 events: under 150ms
- duplicate detection for a 10,000-record import batch: under 2s
- import preview for a representative Apple Health XML payload: under 3s

If the rewritten system misses these numbers, the migration is not done.

## Failure modes

| Area              | Failure                                                                   | Protection                                                   |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Runtime target    | ambiguous deploy environment breaks DB at runtime                         | explicit adapter + build verification                        |
| Storage migration | local data lost or partially migrated                                     | one-way migration tests + snapshot import/export checks      |
| Metric registry   | unsupported metrics disappear silently                                    | loud validation + warning surfaces + tests                   |
| Import pipeline   | duplicate or malformed payloads corrupt trends or block the wrong records | sourceRecordId dedupe + schema validation + regression tests |
| Import pipeline   | timezone skew lands data on the wrong day                                 | localDay normalization tests + cross-timezone fixtures       |
| Review            | full-table scans become slow at scale                                     | bounded reads + summary projections                          |
| Timeline          | event history becomes unusable                                            | paging and filter tests                                      |
| Clinical import   | wrong patient gets merged                                                 | exact-match gate + hard-block on mismatch                    |

Critical gaps if skipped:

- timezone correctness
- duplicate import handling
- identity mismatch blocking
- review/timeline scale protections

## NOT in scope

- direct Garmin / WHOOP / Oura / Fitbit APIs as first-class foundations
- cloud sync or multi-user collaboration
- provider write-back
- page-per-metric UI sprawl
- full PGlite rewrite as the first step
- native companions before there is an actual platform need
- framework swap away from SvelteKit

## Parallelization strategy

| Step                          | Modules touched                                                                                | Depends on                |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| Runtime + Drizzle migration   | `src/lib/server/db`, `src/lib/core/db`, config                                                 | none                      |
| Metric registry               | `src/lib/core/domain`, `src/lib/features/integrations`, shared display logic                   | none                      |
| Review/today/timeline scaling | `src/lib/features/review`, `today`, `timeline`, `imports`                                      | runtime + metric registry |
| Clinical hardening            | `src/lib/features/imports`, `src/lib/features/integrations/identity`, settings/review/timeline | runtime + metric registry |
| Test expansion                | `tests/features`, `tests/support`                                                              | follows each lane         |

Lanes:

- Lane A: runtime + Drizzle
- Lane B: metric registry
- Lane C: review/today/timeline scaling after A + B
- Lane D: clinical hardening after A + B
- Lane E: tests alongside every lane

Execution order:

- Launch A + B in parallel.
- Launch C after A and B are in.
- Launch D after A and B are in.
- Keep E running continuously.

## Verification commands

Core:

- `bun run check`
- `bun run lint`
- `bun run test:unit`
- `bun run test:component`
- `bun run test:e2e`
- `bun run build`

Targeted:

- `bun run test:e2e --grep "health loop"`
- `bun run test:e2e --grep "imports"`
- `bun run test:e2e --grep "weekly review"`
- `bun run test:e2e --grep "today"`

## Decision log placeholders

Fill these once approved:

- Runtime target: ACCEPTED, explicit Bun-compatible runtime target
- Canonical local store: ACCEPTED, Bun SQLite + Drizzle canonical
- Native companion sequence: DEFERRED, not part of the current migration
- Migration cut strategy: ACCEPTED, remove `HealthDatabase` abstraction in the first migration wave
- Phase 1 execution style: ACCEPTED, one tightly coupled migration wave
- Metric model strategy: ACCEPTED, typed metric registry
- Review module strategy: ACCEPTED, full rewrite in the migration wave
- Import subsystem strategy: ACCEPTED, full rewrite in the migration wave
- Regression strategy: ACCEPTED, pre-migration golden fixture harness
- Clinical lane posture: ACCEPTED, SMART read-only first

## Exit criteria

We are done with the migration plan when:

1. runtime target is explicit
2. canonical local store is explicit
3. migration phases are accepted
4. required tests are enumerated
5. not-in-scope items are explicit
6. implementation can start without reopening architecture arguments

## Completion summary

- Step 0: Scope Challenge - scope accepted with native companions deferred
- Architecture Review: 8 issues locked
- Code Quality Review: 3 major decisions locked
- Test Review: golden regression harness added, expanded coverage defined
- Performance Review: concrete targets added for review, timeline, dedupe, and import preview
- NOT in scope: written
- What already exists: written
- TODOS.md updates: none proposed in this pass
- Failure modes: 4 critical gaps flagged
- Outside voice: skipped, repo-local research + official docs used
- Parallelization: 5 lanes, 2 initial parallel, 3 follow-on
- Lake Score: 4/8 recommendations chose the complete option

## Unresolved decisions that may bite later

- none in the active migration scope
