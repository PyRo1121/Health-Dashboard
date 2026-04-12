# Bleeding-Edge Health OS Plan

Status: Active
Date: 2026-04-12
Supersedes:

- `docs/designs/2026-04-12-world-class-forward-plan.md`

Basis:

- `README.md`
- `ARCHITECTURE.md`
- `docs/feature-flows.md`
- `docs/testing-and-verification.md`
- `docs/external-data-sources.md`
- `docs/ops/ci-cd-standards.md`
- `docs/designs/2026-04-12-today-intelligence-implementation-packet.md`
- current feature/test surfaces under `src/lib/features/**`, `tests/features/**`, `.github/workflows/**`, and `apps/ios-companion/**`

External references:

- MyFitnessPal barcode scan help: https://support.myfitnesspal.com/hc/en-us/articles/360032624771-How-do-I-use-the-barcode-scanner-to-log-foods-
- Cronometer barcode scanner: https://cronometer.com/blog/best-barcode-scanner/
- MacroFactor app overview: https://macrofactor.com/energy-expenditure-calculator-app/
- Hevy workout app overview: https://www.hevyapp.com/use-cases/best-workout-app/
- Apple Fitness+ catalog and meditations: https://support.apple.com/guide/fitness-plus/apdcd80997be/ios
- Nike Training Club: https://www.nike.com/gb/ntc-app
- Headspace app overview: https://www.headspace.com/
- Calm stress tools: https://www.calm.com/stress-anxiety
- Calm Sleep overview: https://support.calm.com/hc/en-us/articles/36060717190043-Calm-Sleep-FAQ
- WHOOP overview: https://www.whoop.com/
- WHOOP mental health article: https://www.whoop.com/thelocker/what-whoop-data-tells-us-about-sleep-recovery-and-mental-health/
- Oura cumulative stress: https://support.ouraring.com/hc/en-us/articles/45979919957395-Cumulative-Stress
- Android Health Connect data types: https://developer.android.com/health-and-fitness/health-connect/data-types
- Android Health Connect workout experiences: https://developer.android.com/health-and-fitness/health-connect/experiences/workouts
- HealthKit sample queries: https://developer.apple.com/documentation/healthkit/hksamplequery
- SMART on FHIR quick-start: https://docs.smarthealthit.org/tutorials/server-quick-start

## What This Is

The current repo is no longer in bootstrap mode.

It already has:

- a real daily loop
- review and planning surfaces
- local-first persistence
- import paths for HealthKit and SMART on FHIR
- unit, component, and E2E coverage

What it does not yet have is the thing that would make it beat category leaders:

- one trusted guidance engine
- one content and protocol system for action, not just logging
- one clear operating model for workouts, recovery, sleep, and mental health support

That is the gap this plan closes.

## Market Read

The current field is split by category.

Nutrition leaders win with speed and data density:

- MyFitnessPal wins on logging convenience and recognizable consumer habits, but premium-gates useful capture like barcode scan.
- Cronometer wins on nutrient depth and free barcode value.
- MacroFactor wins on adaptive nutrition coaching, fast logging, and algorithmic calorie adjustment.

Workout leaders win with guided execution:

- Hevy wins on routines, exercise history, and gym progression.
- Apple Fitness+, Nike Training Club, and Peloton win on guided media, trainer-led sessions, and polished content loops.

Recovery and wearable leaders win on daily readiness:

- WHOOP wins on 24/7 strain, sleep, stress, and performance framing.
- Oura wins on sleep, readiness, and stress/resilience language that feels actionable.

Mindfulness leaders win on content quality and in-the-moment relief:

- Headspace wins on breadth across stress, sleep, anxiety, and therapy-adjacent support.
- Calm wins on sleep, breathing, grounding, and structured daily plans.

What they still keep fragmented:

- meal planning is separate from workout execution
- recovery guidance is separate from grocery and meal adaptation
- mental health support is separate from daily physiology and planning
- clinical/device imports are separate from the behavior loop

That fragmentation is the opening.

## Product Thesis

Do not try to beat every competitor at their own narrow game.

Beat them by integrating the loop they keep breaking apart:

```text
signals
  -> one best action now
  -> guided execution
  -> low-friction capture
  -> weekly experiments
  -> next-week plan
  -> back into today
```

The product should feel like a personal health operating system, not a dashboard, not a tracker pile, not a therapy chatbot.

## Engineering Review

### Keep

Keep the current core stack.

- `SvelteKit 2` + `Svelte 5`
- `Bun` runtime
- local SQLite + Drizzle mirror path
- typed feature clients and typed route handlers
- Vitest unit/component split
- Playwright E2E
- native iPhone companion for HealthKit export

Reason:

- the current stack already matches the local-first, deterministic, testable product shape
- the codebase now has explicit feature seams and test/store injection paths
- a rewrite would burn time without improving the actual user loop

### Change

Add missing systems. Do not rewrite the foundation.

1. Add a deterministic guidance engine.
2. Add a structured protocol and content catalog.
3. Add local search and retrieval for workouts, coping tools, and content.
4. Add native Android ingestion instead of forcing a web-only bridge.
5. Add stronger projection/read-model discipline for Today, Review, and Timeline.
6. Add release-grade verification and performance budgets around the guidance loop.

### Do Not Change Yet

- do not rewrite to another frontend framework
- do not move core product logic to cloud-first sync
- do not make remote APIs the owner of core functionality
- do not introduce a generalized LLM chat coach as the main UX
- do not build a social feed or community loop

## Missing Systems

### 1. Guidance Graph

Today and Review need one pure decision layer that ranks actions from:

- physiology
- plan state
- nutrition progress
- recovery signals
- journal context
- sobriety and assessment context

This must stay explicit and explainable.

No opaque model first.

### 2. Protocol Catalog

The app needs structured action objects, not just notices and buttons.

Examples:

- recovery walk
- 10-minute downshift breathing sequence
- low-effort high-protein meal fallback
- crowded-store coping protocol
- sleep wind-down routine
- short mobility reset

Each protocol should have:

- `id`
- `kind`
- `goal`
- `durationMinutes`
- `requiredEquipment`
- `contraindications`
- `evidenceLevel`
- `sourceKind`
- `steps[]`
- `mediaRefs[]`
- `followupCapture`

### 3. Media and Content Layer

Do not build a giant streaming library first.

Start with:

- structured exercise clips
- short guided audio routines
- protocol cards
- curated program sequences

This is enough to make the product feel guided without inheriting Peloton-scale content ops.

### 4. Projection Layer

Today and Review still rely on broad reads and assembled snapshot logic.

That is fine for the current repo size. It will become a bottleneck once more signals, content, and imports land.

The next architecture step is not event-sourcing theater.
It is targeted projections:

- daily signal projection
- protocol effectiveness projection
- weekly experiment projection
- import/provenance projection

### 5. Native Companion Expansion

Keep the iPhone companion lane.
Add Android as a native Kotlin Health Connect companion.

Do not paper over platform-specific health access with a cross-platform abstraction first.
That always sounds elegant and usually ships slower and worse.

## Product Principles

1. One best next action beats five suggestions.
2. Explainability beats magic.
3. Protocols beat vague encouragement.
4. Curated guidance beats open-ended media search.
5. Manual users must still get full value.
6. Imported and inferred data must never look identical.
7. Mental health support must be useful without pretending to be therapy.
8. Weekly review must change next week, not just summarize last week.
9. Every new capability must fit the same loop.
10. TDD and targeted E2E are part of product design, not cleanup after.

## Phase Plan

### Phase 1: Today Intelligence

Status:

- already packetized in `docs/designs/2026-04-12-today-intelligence-implementation-packet.md`

Goal:

- make `/today` the single best operating surface in the app

What ships:

- ranked primary recommendation
- confidence and provenance
- stronger low-signal and stale-plan handling
- explicit action routing into Journal, Health, Nutrition, and Plan

Acceptance bar:

- one clear primary recommendation
- one obvious CTA
- provenance rows on every recommendation
- deterministic unit/component/E2E proof

### Phase 2: Review Decision Engine

Goal:

- make `/review` produce clear experiments, adjustments, and stop/continue calls

What ships:

- ranked weekly experiment recommendations
- continue / stop / adjust decisions
- why-this-matters summaries
- deterministic replay snapshots
- early protocol outcome reporting

Acceptance bar:

- each weekly review ends with a next-week decision
- each decision cites evidence and confidence
- seeded replay yields stable output

### Phase 3: Guidance Graph And Protocol Catalog

Goal:

- unify Today and Review around the same action vocabulary

What ships:

- `guidance` domain contracts
- protocol catalog and content manifests
- action classes shared by Today and Review
- capture hooks after protocol completion

Acceptance bar:

- Today and Review use the same recommendation primitives
- at least one workout, one recovery, one nutrition, and one coping protocol ship end-to-end
- protocol manifests validate in tests

### Phase 4: Guided Movement And Recovery

Goal:

- make movement execution feel guided, adaptive, and recovery-aware

What ships:

- structured routine player for workout templates
- per-exercise media clips
- recovery-day substitutions
- progression and completion history
- short mobility and low-energy sessions

Acceptance bar:

- a planned workout can become a guided execution flow
- recovery logic can safely downgrade a workout
- media failure still leaves usable text guidance

### Phase 5: Mental Health Support And Coping

Goal:

- add useful, non-fake mental health help inside the same loop

What ships:

- breathing, grounding, downshift, and sleep wind-down protocols
- coping kits linked from anxiety, stress, sleep debt, and journal context
- assessment-driven support routing
- explicit crisis / professional-support escalation copy

Acceptance bar:

- mental-health flows are framed as support and coping, not diagnosis or treatment
- anxiety, poor sleep, and overload signals can trigger concrete coping protocols
- safety and escalation paths are test-covered

### Phase 6: Nutrition Intelligence And Execution

Goal:

- close the gap with nutrition-first leaders without becoming nutrition-only

What ships:

- lower-friction meal capture
- saved meal and recovery meal intelligence
- nutrient-gap summaries that feed Today and Review
- stronger packaged and recipe execution with local caching

Acceptance bar:

- nutrition guidance feeds daily action, not just reports
- local catalog remains useful without live upstream APIs
- barcode, enrichment, and saved-meal paths stay deterministic under test

### Phase 7: Provenance, Platform Expansion, And Clinical Trust

Goal:

- make external records usable without trust collapse

What ships:

- source-scoped provenance surfaces
- Android Health Connect native companion
- stronger HealthKit incremental bridge
- narrow SMART on FHIR expansion
- import identity and normalization explainability

Acceptance bar:

- one-click provenance for important signals
- Android and iPhone imports land in the same canonical event graph
- identity mismatches stay explicit and safe

### Phase 8: Enterprise Operations And Release Discipline

Goal:

- make every phase shippable without heroics

What ships:

- stricter CI gates by surface area
- golden snapshot and replay suites
- performance budgets for Today, Review, and Imports
- preview and rollback proof
- runbooks for release, triage, and regression response

Acceptance bar:

- the main user loops are release-gated by the right tests
- operational docs match the real commands
- no architecture tranche lands without proof commands and rollback notes

## Build Order Rules

1. Do not start guided media before the guidance graph exists.
2. Do not start Android or wider clinical expansion before provenance is strong.
3. Do not start generalized AI coaching before protocols and decision logic are explicit.
4. Do not start a huge content library before the protocol catalog exists.
5. Do not let nutrition or mental-health work fork away from the Today and Review loop.

## Ship Now / Later Matrix

### Ship Now

- Today Intelligence
- Review decision engine
- shared guidance primitives
- protocol catalog
- curated recovery and coping protocols
- guided movement from existing workout templates
- stronger provenance on Today, Review, Timeline, and Imports

### Ship After Prerequisites

- Android Health Connect companion
- richer HealthKit incremental sync
- expanded clinical import sets
- adaptive progression logic based on protocol completion history
- on-device photo logging if it can remain deterministic and local-first

### Later

- cloud backup and restore
- notifications and scheduling intelligence
- broader wearable source matrix
- provider write-back or clinician collaboration workflows

### Do Not Build Now

- generic AI chatbot coach
- open-ended YouTube or internet video search in-product
- social feed / social accountability network
- broad medication-management or diagnosis claims
- framework rewrite

## Testing Standard

Everything is TDD and targeted E2E.

That means:

### For guidance and review changes

Required:

- pure unit tests for ranking, confidence, and provenance
- seeded golden snapshots
- component tests for the rendered recommendation surface
- E2E for the dominant user path and the most dangerous edge case

### For protocol and content changes

Required:

- schema validation tests for protocol manifests
- accessibility assertions for timed and guided flows
- component tests for media fallback and step progression
- E2E for protocol launch, completion, and follow-up capture

### For platform and import changes

Required:

- normalization unit tests
- identity/provenance regression tests
- seeded import replay tests
- E2E from import to Timeline, Today, and Review

### For ops and release changes

Required:

- `bun run check`
- `bun run build`
- `bun run check:operational`
- targeted smoke/E2E proof
- workflow/config regression proof where CI behavior changes

## Release Gates

Minimum gate for any user-visible phase:

```text
- bun run check
- bun run build
- focused unit lane
- focused component lane
- phase-specific E2E grep lane
```

Additional gate for trust-sensitive changes:

```text
- deterministic replay proof
- provenance and identity proof
- review refresh proof
- import regression proof if external records are involved
```

Additional gate for guided media / protocol phases:

```text
- protocol schema validation
- asset existence / fallback proof
- accessibility proof
- performance budget proof
```

## Performance Targets

Start enforcing budgets now.

Initial targets:

- Today cold load, local seeded data: under 1 second on a normal laptop
- Review seeded 12-week rebuild: under 1.5 seconds
- typical import preview: under 2 seconds
- no route should block on remote calls for the primary user loop

If a feature cannot hit these budgets, it needs a projection or cache strategy before it ships.

## Operating Model For Content

The content model decides whether this becomes useful software or a content treadmill.

Rules:

- keep protocol definitions versioned and testable
- use curated content packs, not open internet search
- store media references in structured manifests
- prefer short clips and short audio over giant session libraries
- every protocol must connect to a real user state and a follow-up capture path

## Risk Register

### Product risk

Trying to be a tracker, a coach, a workout app, and a meditation app at once.

Mitigation:

- force every feature through the Today -> action -> capture -> Review loop

### Clinical and trust risk

Making support flows sound like treatment or diagnosis.

Mitigation:

- coping/support framing only
- explicit escalation boundaries
- provenance and confidence on every important recommendation

### Content ops risk

Committing to a giant media catalog too early.

Mitigation:

- protocol-first
- curated small library
- fallback text-first execution

### Stack risk

Adding more signals without tightening read-model and projection discipline.

Mitigation:

- targeted projections before broad platform expansion

## Next Concrete Move

The next code tranche stays the same:

- implement `Today Intelligence`

But do it under this larger rule:

- Phase 1 is not just a nicer Today page
- it is the first slice of the future guidance graph

That is the whole game.
