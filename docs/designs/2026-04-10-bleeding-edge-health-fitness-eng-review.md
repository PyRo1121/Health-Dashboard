# Bleeding-Edge Health + Fitness Engineering Review

Historical note: this document is preserved as a planning/review record. Code paths, file references, and architecture details inside may be stale; use `ARCHITECTURE.md` and the living docs under `docs/` for current implementation truth.

Status: Historical Review Record  
Date: 2026-04-10  
Branch: `fix/grok-pr-enhancements`  
Superseded by: `ARCHITECTURE.md` and the living docs under `docs/`  
Related docs:

- [engineering plan](./2026-04-02-personal-health-cockpit-engineering-plan.md)
- [health integration options](../research/2026-04-02-health-integration-options.md)
- [external data sources](../external-data-sources.md)
- [architecture](../../ARCHITECTURE.md)

## Executive Take

The product already has the right loop:

```text
import / log
  -> normalize
  -> review
  -> plan
  -> execute today
  -> back into review
```

That is the edge.

The wrong move now would be turning this into twelve disconnected health dashboards, or spending the main innovation token on a clever browser database while the actual health graph is still shallow.

My recommendation:

1. Keep `SvelteKit 2 + Svelte 5 + Bun + Playwright + Vitest + Bits UI + Zod`.
2. Stop leaving the runtime target fuzzy. Replace `adapter-auto` with an explicit adapter.
3. Make one storage story canonical. Right now the app is half migrated and the abstractions are doing too much work.
4. Expand the health graph hard, but do it through native companions + imports + one typed metric registry, not page sprawl.
5. Add Android Health Connect and broaden the iOS HealthKit bridge before touching direct wearable APIs.

If you want "bleeding edge", spend it on the data model and native ingestion, not on replacing a good frontend stack for sport.

## Step 0: Scope Challenge

### What already exists

The repo already solves most of the product shape:

- manual health logging, meds/supplements, sleep context, and symptom/anxiety capture in [`src/lib/features/health/service.ts`](../../src/lib/features/health/service.ts)
- workout templates and exercise search in [`src/lib/features/movement/service.ts`](../../src/lib/features/movement/service.ts)
- import preview and commit with raw artifact staging in [`src/lib/features/imports/store.ts`](../../src/lib/features/imports/store.ts)
- review synthesis across health, nutrition, sobriety, planning, and journal in [`src/lib/features/review/service.ts`](../../src/lib/features/review/service.ts)
- iOS HealthKit companion ingestion contract in [`src/lib/features/integrations/bridge/schema.ts`](../../src/lib/features/integrations/bridge/schema.ts) and [`apps/ios-companion`](../../apps/ios-companion)
- SMART sandbox clinical import path and owner identity gate in [`src/lib/features/imports/store.ts`](../../src/lib/features/imports/store.ts)

The product is not starting from zero. Good.

### Minimum change that actually gets you "fitness + everything health related"

Do not add a new top-level page for every metric family.

The minimum real expansion is:

1. broaden the canonical metric/event registry
2. broaden native ingestion lanes
3. broaden review and today surfaces
4. keep timeline as the proof surface
5. keep planning tied to actual recovery / sleep / activity signals

That means:

- `Health`
  - manual logging, quick capture, medication, symptom context
- `Timeline`
  - raw and normalized truth
- `Review`
  - trends, correlations, readiness, adherence
- `Today`
  - execution and adaptations
- `Integrations / Imports`
  - ingress

Not:

- `/sleep`
- `/heart`
- `/labs`
- `/glucose`
- `/blood-pressure`
- `/body-composition`
- `/wearables`

That is scope creep dressed as structure.

### Complexity check

If the next tranche introduces:

- 8+ new feature files for separate metric pages, or
- 3+ new persistence layers, or
- direct custom integrations for multiple wearables at once

stop. That is overbuilt.

### Search-before-building calls

- [Layer 1] Svelte's official packages page now points people toward SvelteKit, official adapters, remote functions, Playwright, Vitest, and Better Auth where auth is needed.
- [Layer 1] Drizzle has an official Bun + SQLite path, which matters because the repo already uses `bun:sqlite`.
- [Layer 1] Apple HealthKit and Android Health Connect are still the correct aggregator lanes for health and fitness data.
- [Layer 1] SMART on FHIR remains the right clinical standard, and Epic is the practical first patient-app target.
- [Layer 2] PGlite is now much more real than it was when the first plan was written. It runs in browser, Bun, and Node, persists to IndexedDB in browser, and supports extensions like `pgvector`.
- [Layer 2] Electric is a serious sync lane if multi-device/cloud sync becomes first-class. It is not the thing to bolt on before the local health graph is finished.

### Completeness check

Do the complete version of the health graph, not the demo version:

- provenance on every imported metric
- raw artifact retention
- deterministic dedupe
- patient identity gate for clinical imports
- test coverage for each ingestion lane
- review wiring for every new metric family

Skipping those would save almost no AI time and create silent data trust failures.

### Distribution check

If native companions become part of the core product, they need a real distribution lane.

Today the iOS companion is still manual:

- generate Xcode project locally
- configure signing manually
- run on a real device

See [`apps/ios-companion/README.md`](../../apps/ios-companion/README.md).

That is acceptable for a proof of concept. It is not a finished platform lane.

## Recommended Product Scope

### In scope now

- iOS HealthKit bridge expansion beyond the first three metrics
- Android Health Connect companion
- typed metric registry for broader health and fitness
- clinical imports staying read-only and provenance-heavy
- review surfaces for fitness and biometrics
- today adaptations using imported biometrics when present
- canonical storage cleanup

### World-class metric families

```text
Recovery
  sleep duration
  sleep stages / quality if available
  resting heart rate
  HRV
  respiratory rate
  body temperature
  SpO2

Fitness
  steps
  active energy
  workouts / exercise sessions
  distance
  elevation gained
  VO2 max
  pace / power where available

Body + vitals
  weight
  body fat
  lean mass if available
  blood pressure
  blood glucose

Clinical
  labs
  medications
  conditions
  procedures
  immunizations

Context
  manual symptoms
  anxiety
  sobriety
  journal
  assessments
```

## Tech Stack Scorecard

| Area                 | Current                               | Recommendation                                            | Why                                                                                         |
| -------------------- | ------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| App framework        | SvelteKit 2                           | Keep                                                      | Still a top-tier fit for a private app shell, SSR, file routes, and typed server boundaries |
| Component model      | Svelte 5 runes                        | Keep                                                      | Modern and already aligned with the codebase                                                |
| Runtime              | Bun 1.3.10                            | Keep                                                      | Fast local dev, native SQLite, good fit for a local dashboard                               |
| Deployment target    | `adapter-auto`                        | Change now                                                | The app imports `bun:sqlite`, so runtime is not abstract anymore                            |
| Persistence          | Bun SQLite server + legacy Dexie path | Collapse to one canonical path                            | Current abstraction is carrying migration weight and future complexity                      |
| SQL layer            | hand-rolled JSON row wrapper          | Replace with Drizzle on Bun SQLite                        | Better schema discipline, migrations, indexes, and future analytics                         |
| Browser DB           | legacy Dexie migration path           | Keep only as migration/import tooling for now             | Live runtime is not using Dexie as primary storage anymore                                  |
| Sync                 | none                                  | Defer Electric until multi-device/cloud is truly next     | Good future lane, wrong current focus                                                       |
| Validation           | Zod                                   | Keep                                                      | Correct choice for import and write contracts                                               |
| E2E                  | Playwright                            | Keep                                                      | Already strong and still best-in-class                                                      |
| Unit/component tests | Vitest + Testing Library              | Keep                                                      | Good fit for SvelteKit                                                                      |
| UI primitives        | Bits UI                               | Keep                                                      | Svelte-native, accessible, low-chrome                                                       |
| Auth                 | none                                  | Keep none for local single-user                           | Do not add auth just to feel enterprise                                                     |
| Future auth          | not present                           | Better Auth when remote sync/user accounts actually exist | Official Svelte packages page points here, but you do not need it yet                       |
| Native ingestion     | iOS companion only                    | Expand to iOS + Android companions                        | This is where the real product edge lives                                                   |

### Dependency posture right now

`bun outdated` says the repo is already close to current.

Patch-level updates available now:

- `jsdom` `29.0.1 -> 29.0.2`
- `@vitest/coverage-v8` `4.1.2 -> 4.1.4`
- `eslint` `10.1.0 -> 10.2.0`
- `prettier` `3.8.1 -> 3.8.2`
- `vitest` `4.1.2 -> 4.1.4`

Major-version candidates, do not bump blindly:

- `vite` `7.3.1 -> 8.0.8`
- `typescript` `5.9.3 -> 6.0.2`
- `@sveltejs/vite-plugin-svelte` `6.2.4 -> 7.0.0`
- `@types/node` `24.12.0 -> 25.6.0`

Recommendation:

- take the patch bumps soon
- gate the major bumps behind one dedicated compatibility branch after the runtime and storage decisions are locked

## Architecture Review

### 1. [P1] (confidence: 10/10) `svelte.config.js:16` - runtime target is still unresolved

The app uses `bun:sqlite` in [`src/lib/server/db/client.ts`](../../src/lib/server/db/client.ts), but SvelteKit is still configured with `adapter-auto` in [`svelte.config.js`](../../svelte.config.js).

That means the codebase already assumes a Bun-local runtime while the build target is still pretending to be generic.

Recommendation:

- **Choose explicit Bun runtime now.**

Options:

| Option                                                                    | Tradeoff                                                        | Completeness |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------ |
| A. Keep `adapter-auto`                                                    | Lowest work, keeps target ambiguous, likely bites later         | 3/10         |
| B. Switch to an explicit Bun-compatible adapter now                       | Slightly more work, but runtime and storage model finally match | 9/10         |
| C. Remove Bun-specific server code and go back to generic Node/hosted SSR | Bigger rewrite, loses the local-SQL advantage                   | 4/10         |

Opinionated call: **B**.

### 2. [P1] (confidence: 9/10) `src/lib/core/db/client.ts:1`, `src/lib/server/db/client.ts:1`, `src/lib/core/db/types.ts:24` - persistence is carrying migration debt in the core abstraction

The repo still defines one `HealthDatabase` abstraction for both:

- Dexie in the browser
- manual `bun:sqlite` tables on the server

But the live app writes through API routes to server SQLite. Dexie is now mostly legacy migration and test plumbing, see [`src/lib/core/http/feature-client.ts`](../../src/lib/core/http/feature-client.ts) and [`src/lib/core/db/migrate-client.ts`](../../src/lib/core/db/migrate-client.ts).

This is the worst middle state:

- not truly browser-local
- not fully SQL-first
- every storage improvement has to honor both shapes

Recommendation:

- **Collapse onto Bun SQLite as the canonical store, then remove the fake-neutral persistence layer over time.**

Options:

| Option                                                                                     | Tradeoff                                                                                   | Completeness |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------ |
| A. Keep dual Dexie + Bun SQLite long-term                                                  | Lowest migration cost, highest long-term complexity                                        | 4/10         |
| B. Commit to Bun SQLite as canonical, keep Dexie only for one-way migration/export tooling | Strongest near-term simplification, fits the live runtime                                  | 9/10         |
| C. Jump now to PGlite everywhere                                                           | More novel and elegant on paper, much bigger migration while product scope is still moving | 7/10         |

Opinionated call: **B**.

### 3. [P1] (confidence: 9/10) `src/lib/core/domain/types.ts:266`, `src/lib/features/integrations/bridge/schema.ts:1` - the health graph is too stringly and too narrow for the next phase

Current limits:

- `HealthEvent.eventType: string`
- `NativeCompanionRecord.metricType: string`
- only one native companion connector, `healthkit-ios`
- only three supported HealthKit metrics:
  - sleep duration
  - step count
  - resting heart rate

That is enough for the proof of concept. It is not enough for "fitness and anything health related."

Recommendation:

- **Add a typed metric registry now, before broadening connectors.**

Options:

| Option                                                                                   | Tradeoff                                                       | Completeness |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------ |
| A. Keep open strings and add metrics ad hoc                                              | Fastest, but drift and duplicate label logic start immediately | 3/10         |
| B. Introduce a `HealthMetricType` registry with source capabilities and display metadata | Slight design work now, much easier expansion later            | 10/10        |
| C. Split every metric family into its own table immediately                              | More explicit, but overbuilt for the current product stage     | 6/10         |

Opinionated call: **B**.

### 4. [P2] (confidence: 8/10) `apps/ios-companion/README.md:33` - native companion is a product lane without a ship lane

You already have the right native direction, but not the release mechanics.

There is no clear Android companion yet, and the iOS flow is still manual Xcode setup.

Recommendation:

- **Treat native companions as real artifacts once you widen the metric set.**

That means:

- Android companion repo/workspace
- build instructions that are not "open Xcode and click around"
- signed test-flight / internal distribution plan
- CI smoke build for the native code

## Code Quality Review

### 1. [P1] (confidence: 9/10) `src/lib/server/db/client.ts:65` - the hand-rolled SQLite wrapper is doing ORM work badly

The current Bun SQLite layer:

- stores full records in `record_json`
- duplicates indexed scalar columns manually
- implements `where(...).equals(...)`
- reimplements sort/query behavior in TS

It works, but this is a lot of infrastructure to own for a personal product.

Recommendation:

- **Move to Drizzle on Bun SQLite.**

Why:

- schema and migrations get explicit
- queries stop being handwritten adapter code
- indexes and numeric columns become real SQL decisions
- future analytics become less painful

This is "engineered enough." Not a rewrite for fun.

### 2. [P1] (confidence: 8/10) `src/lib/features/health/service.ts:106` - the health page logic hard-codes sleep plus manual events

`isHealthPageEvent(...)` currently admits:

- `sleep-duration`
- manual events

That means new imported metrics will land in the DB and timeline, but not automatically participate in the health surface.

Recommendation:

- **Stop hard-coding page-admitted metrics in feature code. Drive this from the metric registry.**

### 3. [P2] (confidence: 7/10) `src/lib/core/http/feature-client.ts:19`, `src/lib/server/http/action-route.ts:67` - the repo has its own mini transport framework

This client/route pattern is clean enough today, but Svelte's own docs now recommend remote functions for many typed server interactions.

I would not rewrite the app around this immediately.

I would:

- keep existing action routes stable
- use the next greenfield feature to test whether remote functions simplify new code
- only migrate if the result is clearly smaller

This is a medium-priority cleanup, not a blocker.

## Test Review

### Existing strength

The current test surface is stronger than average for a repo this early:

- health loop e2e exists in [`tests/features/e2e/health-loop.e2e.ts`](../../tests/features/e2e/health-loop.e2e.ts)
- imports e2e exists in [`tests/features/e2e/imports.e2e.ts`](../../tests/features/e2e/imports.e2e.ts)
- there are unit and component tests across health, imports, integrations, review, movement, nutrition, planning, and today

That is good news. You already have a harness worth extending.

### Coverage diagram for the next phase

```text
CODE PATH COVERAGE
===========================
[+] Current ingestion
    ├── [★★★ TESTED] Day One preview + commit
    ├── [★★★ TESTED] SMART sandbox identity gate + import
    ├── [★★★ TESTED] HealthKit companion import for 3 metrics
    └── [★★★ TESTED] Review/timeline surfacing for those imports

[+] Planned expanded ingestion
    ├── [GAP] iOS HealthKit expanded metrics registry
    │   ├── HRV
    │   ├── VO2 max
    │   ├── workouts
    │   ├── active energy
    │   ├── weight / body fat
    │   ├── blood pressure
    │   ├── blood glucose
    │   └── SpO2 / temperature
    ├── [GAP] Android Health Connect companion normalization
    ├── [GAP] duplicate source reconciliation across Apple XML + HealthKit companion
    ├── [GAP] owner/profile mismatch behavior for real clinical imports
    └── [GAP] import artifact replay and schema-version upgrade tests

USER FLOW COVERAGE
===========================
[+] Current user flows
    ├── [★★★ TESTED] Manual health loop
    ├── [★★★ TESTED] Import center preview and commit
    ├── [★★★ TESTED] Today -> Review loop
    └── [★★★ TESTED] Plan -> Today -> Review loop

[+] Planned user flows
    ├── [GAP] [->E2E] iPhone companion export with expanded metric bundle
    ├── [GAP] [->E2E] Android companion export/import flow
    ├── [GAP] [->E2E] duplicate import warning with no silent double-counting
    ├── [GAP] [->E2E] biometrics change Today recommendations
    ├── [GAP] [->E2E] review shows trend shifts from imported fitness metrics
    ├── [GAP] [->E2E] clinical import blocked on patient mismatch
    ├── [GAP]         permission denied / partial permission companion states
    └── [GAP]         high-volume import remains responsive

PERFORMANCE / SCALE PATHS
===========================
[+] Planned scale tests
    ├── [GAP] [->UNIT] 50k+ health events weekly review generation
    ├── [GAP] [->UNIT] timeline sorting and filtering at 100k+ events
    └── [GAP] [->UNIT] bulk dedupe on large Apple export

─────────────────────────────────
COVERAGE: current core flows are strong
GAPS: all expanded health/fitness scope needs tests
PRIORITY: ingestion correctness > review correctness > UX polish
─────────────────────────────────
```

### Required next tests

Before implementing the broader health graph, add these plan requirements:

1. `tests/features/unit/integrations/metric-registry.test.ts`
   - assert each supported metric has category, unit behavior, display label, and Today/Review participation flags

2. `tests/features/unit/imports/dedupe-large-batch.test.ts`
   - assert duplicate detection works on large bundles without one-query-per-row behavior

3. `tests/features/e2e/imports-expanded-healthkit.e2e.ts`
   - expanded iOS metric bundle preview, commit, timeline, review, and Today adaptation

4. `tests/features/e2e/imports-health-connect.e2e.ts`
   - Android companion flow

5. `tests/features/e2e/clinical-identity-gate.e2e.ts`
   - mismatch, exact match, and partial-data failure states

6. `tests/features/unit/review/fitness-highlights.test.ts`
   - imported fitness metrics materially alter weekly review output

## Performance Review

### 1. [P1] (confidence: 9/10) `src/lib/features/review/service.ts:56` - review generation still does full-table loads

`loadReviewSourceData(...)` pulls whole tables with `toArray()` and then filters in memory.

That is fine for:

- manual logging
- small imports
- early development

It is not fine for:

- years of wearables
- clinical imports
- dense daily metrics

Recommendation:

- once the health graph widens, move review reads to week-bounded queries and pre-aggregated daily summaries

### 2. [P1] (confidence: 9/10) `src/lib/features/timeline/service.ts:22` - timeline reads and sorts the full event table

`listTimelineEvents(...)` loads every health event and sorts in memory.

For a personal health history, this will become slow long before the product feels "complete."

Recommendation:

- add paged query semantics before widening imports

### 3. [P1] (confidence: 8/10) `src/lib/features/imports/store.ts:111` - duplicate detection is one query per candidate event

`dedupeImportedEvents(...)` checks `sourceRecordId` in a loop.

That is okay for:

- 3 HealthKit metrics
- tiny sandbox bundles

It is bad for:

- large Apple Health XML imports
- future clinical bundles
- Android aggregation dumps

Recommendation:

- batch load existing `sourceRecordId`s for the candidate set, then diff in memory

### 4. [P2] (confidence: 7/10) `src/lib/server/db/client.ts:96` - JSON blob storage will fight analytics

The current SQL layer stores the full record as JSON text and mirrors only a few scalar columns.

That is cheap now, but it makes numeric range filtering and future metric rollups harder than they should be.

Recommendation:

- if you keep Bun SQLite, graduate to real typed tables for the highest-volume metric families

## Failure Modes

| Codepath                      |                                          Failure mode |          Test today? | Error handling? | User sees?                       | Severity |
| ----------------------------- | ----------------------------------------------------: | -------------------: | --------------: | -------------------------------- | -------- |
| iOS companion import          |                 duplicate bundle double-counts events |              partial |         partial | likely misleading trends         | High     |
| Android Health Connect import |                         wrong timezone day assignment |                   no |              no | silent wrong day                 | Critical |
| Clinical import               |                  wrong patient matched to local owner | partial sandbox only |             yes | blocked if exact gate works      | Critical |
| Expanded metric registry      |                   unsupported metric silently dropped |                   no |         partial | maybe warning, maybe invisible   | High     |
| Review build                  | large metric volume makes weekly review slow or stale |                   no |              no | spinner / stale insight          | High     |
| Today adaptation              | imported biometrics fail to influence recommendations |                   no |              no | silent underpowered product      | Medium   |
| Timeline                      |             too many events make load/filter unusable |                   no |              no | sluggish history view            | Medium   |
| Native companion release      |                      no signed build path for testers |                   no |              no | companion stays "local dev only" | Medium   |

### Critical gaps

These would bite hardest if left unresolved:

1. timezone/day assignment for imported metrics
2. patient identity mismatch on clinical imports
3. duplicate import reconciliation across multiple Apple lanes

## Recommended Architecture

### Preferred path

```text
SvelteKit UI
  -> explicit Bun runtime target
  -> typed server boundary
  -> Bun SQLite + Drizzle
  -> normalized health graph
  -> review/today projections

iOS HealthKit companion
  -> bundle export / incremental export
  -> import center

Android Health Connect companion
  -> bundle export / incremental export
  -> import center

Clinical SMART on FHIR
  -> OAuth / app registration later
  -> import + identity gate
  -> read-only clinical events
```

### Why this path

- it keeps the product local and private
- it keeps the live runtime coherent
- it broadens health data where the user feels it
- it does not force a speculative sync stack too early

## NOT in scope

- full multi-user cloud sync
- direct Garmin / WHOOP / Oura / Fitbit APIs as foundational dependencies
- provider write-back
- messaging / scheduling / claims-first product shape
- a separate page for every metric family
- replacing SvelteKit with another app framework
- rewriting everything around PGlite before the product loop is complete

## Worktree Parallelization Strategy

| Step                             | Modules touched                                                                                             | Depends on                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Metric registry + domain typing  | `src/lib/core/domain`, `src/lib/features/integrations`, `src/lib/core/shared`                               | -                                                  |
| Bun SQLite + Drizzle migration   | `src/lib/server/db`, `src/lib/core/db`, config/runtime                                                      | metric registry can be parallel, final merge later |
| iOS companion metric expansion   | `apps/ios-companion`, `src/lib/features/integrations/bridge`                                                | metric registry                                    |
| Android companion bootstrap      | `apps/android-companion`, `src/lib/features/integrations/bridge`                                            | metric registry                                    |
| Review / Today fitness surfacing | `src/lib/features/review`, `src/lib/features/today`, `src/lib/features/health`, `src/lib/features/timeline` | metric registry + ingestion contracts              |
| Test expansion                   | `tests/features`, `tests/support`                                                                           | each lane can add its own tests                    |

### Parallel lanes

- Lane A: metric registry -> review/today surfacing
- Lane B: Bun SQLite + Drizzle migration
- Lane C: iOS companion expansion
- Lane D: Android companion bootstrap
- Lane E: test harness expansion

### Execution order

Launch A + B + C in parallel.

Start D once the metric registry is stable.

Keep E running alongside each lane.

### Conflict flags

- Lanes A, C, and D all touch the integration bridge contract
- Lanes A and B both touch the storage/domain boundary
- Lanes A and E will overlap in shared test fixtures

## Recommendation Bundle

If you want the sharpest next move:

1. choose **Bun SQLite + Drizzle** as the canonical local data plane
2. choose **explicit Bun runtime target**
3. introduce a **typed metric registry**
4. expand **iOS HealthKit** and add **Android Health Connect**
5. keep **SMART on FHIR** as the clinical lane
6. defer **Electric sync** until you actually need multi-device/cloud state

That is the highest-leverage stack for this product.

Not the flashiest. The best.

## Sources

- Svelte official packages and current ecosystem guidance: https://svelte.dev/packages
- PGlite docs: https://pglite.dev/docs/ and https://pglite.dev/docs/about
- Electric sync overview: https://electric-sql.com/sync
- Drizzle Bun + SQLite guide: https://orm.drizzle.team/docs/get-started/bun-sql-existing
- Dexie export/import docs: https://dexie.org/docs/ExportImport/dexie-export-import
- Apple HealthKit overview: https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework
- Apple HealthKit authorization: https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- Apple clinical records: https://developer.apple.com/documentation/healthkit/accessing-health-records
- Android Health Connect data types: https://developer.android.com/health-and-fitness/health-connect/data-types
- Google Fit migration FAQ: https://developer.android.com/health-and-fitness/guides/health-connect/migrate/migration-faq
- Epic interoperability portal: https://open.epic.com/Home/Interoperate
- SMART App Launch conformance: https://build.fhir.org/ig/HL7/smart-app-launch/conformance.html
