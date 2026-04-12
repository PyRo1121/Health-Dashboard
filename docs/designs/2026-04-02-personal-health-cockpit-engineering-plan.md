# Personal Health Cockpit Engineering Plan
Historical note: this document is preserved as a planning/review record. Code paths, file references, and architecture details inside may be stale; use `ARCHITECTURE.md` and the living docs under `docs/` for current implementation truth.

Status: Historical
Date: 2026-04-02
Supersedes: `docs/designs/2026-04-02-personal-health-cockpit-starter-plan.md`
Superseded by: `ARCHITECTURE.md` and the living docs under `docs/`
Framework: SvelteKit
Review Type: plan-eng-review
Detailed tranche plan: `docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md`
Design system: `DESIGN.md`
Visual spec: `docs/designs/2026-04-02-personal-health-cockpit-visual-spec.md`
Implementation packet: `docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md`
Next integration packet: `docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t9-t10.md`

## Executive Call

The original plan was directionally right.

It was not engineered enough.

The weak spots were:

1. integration strategy was too vague
2. journaling was buried inside "notes"
3. mental-health assessments were underspecified
4. local persistence technology was not chosen
5. failure modes around imports and identity reconciliation were missing

This document fixes that.

## Step 0: Scope Challenge

## What already exists

Inside this project:

- [docs/README.md](../README.md)
- [2026-04-02-personal-health-cockpit-starter-plan.md](2026-04-02-personal-health-cockpit-starter-plan.md) (historical only)
- [2026-04-02-health-dashboard-landscape.md](../research/2026-04-02-health-dashboard-landscape.md)

Outside the project, but strategically important:

- Apple Health already aggregates wellness data, clinical records, medications, and state of mind.
- Android Health Connect now covers wellness, mindfulness, and medical records in FHIR.
- Epic/MyChart already supports patient-authorized FHIR access through OAuth.
- USDA FoodData Central already solves nutrient-data sourcing.
- Day One already provides exportable JSON history.

## Minimum build that achieves the goal

The smallest serious build is:

1. local-first SvelteKit app
2. one unified event timeline
3. daily check-in
4. journal
5. sobriety tracker
6. food logging with recurring meals
7. assessments
8. import center with at least Apple Health XML and Day One JSON
9. weekly review

Anything smaller turns into a nice-looking notebook.

Anything much bigger before shipping turns into integration theater.

## Complexity check

This plan is above the 8-file / 2-service smell threshold.

That is acceptable only if we keep the architecture brutally modular and phase-gated.

The mistake would be building all connectors in the first slice.

## Search-before-building decisions

### Persistence

Recommendation:

- Use Dexie over PGlite for v1.

Why:

- Dexie is built on standard browser IndexedDB and has a Svelte path.
- PGlite is powerful, but it adds a WASM Postgres layer and more moving parts than this v1 needs.
- This product should spend zero innovation tokens on local database novelty.

### Health data aggregation

Recommendation:

- Prefer Apple Health and Health Connect as upstream aggregators.

Why:

- They already do the ugly device/app merge work.
- Direct vendor integrations are optional, not foundational.

### Clinical data interoperability

Recommendation:

- Design for SMART on FHIR, but do not block v1 on live patient portal integration.

Why:

- That is the correct standard.
- It is also setup-heavy and institution-dependent.

## Recommendation

Proceed with the deeper plan below.

Do not reduce scope below journaling + assessments + imports.

Those are not extras. They are the thing.

## Architecture Review

## Architecture choice

Use a local-first SvelteKit app with:

- Dexie for primary persistence
- worker-based import and normalization pipeline
- domain services in the client
- deterministic review snapshots
- connector adapter boundaries from day one

## Why this architecture

It is boring enough to trust and flexible enough to grow.

It also keeps you out of the trap where your "web app" secretly requires native capabilities on day one.

## System Architecture

```text
SvelteKit UI
|
|-- Today
|-- Journal
|-- Nutrition
|-- Sobriety
|-- Health
|-- Assessments
|-- Timeline
|-- Review
|-- Imports
|-- Integrations
|-- Settings
|
v
Application Services
|
|-- daily-record service
|-- journal service
|-- nutrition service
|-- sobriety service
|-- assessment service
|-- review service
|-- import service
|-- backup/export service
|
v
Connector Adapters
|
|-- apple-health-xml adapter
|-- day-one-json adapter
|-- csv adapter
|-- future-healthkit adapter
|-- future-health-connect adapter
|-- future-fhir adapter
|
v
Normalization Pipeline
|
|-- parse
|-- validate
|-- dedupe
|-- normalize units
|-- assign provenance
|-- write canonical events
|
v
Local Database (Dexie / IndexedDB)
|
|-- daily_records
|-- journal_entries
|-- food_entries
|-- health_events
|-- sobriety_events
|-- assessment_results
|-- import_batches
|-- import_artifacts
|-- review_snapshots
```

## Domain model

### Core entities

- `DailyRecord`
- `JournalEntry`
- `FoodEntry`
- `HealthEvent`
- `SobrietyEvent`
- `AssessmentResult`
- `ImportBatch`
- `ImportArtifact`
- `ReviewSnapshot`

### Canonical event rule

No connector writes directly into "final" UX tables without provenance.

Everything imported lands as:

1. raw artifact
2. normalized event
3. optional projection into daily summaries

That protects you from bad parsers and future remaps.

## Information architecture

```text
Today
  - quick mood / energy / stress
  - sobriety status
  - cravings
  - meals today
  - today's journal prompt

Journal
  - long-form entries
  - templates
  - linked entries
  - imported journal history

Health
  - vitals
  - symptoms
  - medications
  - clinical records summary

Nutrition
  - meal log
  - recurring meals
  - nutrient summaries

Assessments
  - PHQ-9
  - GAD-7
  - WHO-5
  - AUDIT-C / AUDIT

Timeline
  - all events
  - filters by source and type

Review
  - weekly brief
  - correlations
  - flags
  - next-week experiment

Imports
  - upload files
  - import history
  - dedupe review

Integrations
  - available connectors
  - setup status
  - sync guidance
```

## Design System Alignment

UI implementation should follow [DESIGN.md](../../DESIGN.md).

The important design constraints are:

- typography-led, not card-led
- calm neutral palette with restrained pine accent
- Today and Review as the two highest-signal surfaces
- first-class Journal, not a note stub
- explicit interaction states for every major feature
- warm but adult tone for sobriety and mental-health flows

## Interaction State Coverage

Implementation must include the feature-state coverage defined in [DESIGN.md](../../DESIGN.md), especially for:

- Today
- Journal
- Sobriety
- Assessments
- Nutrition
- Imports
- Review

If a tranche ships without its empty, error, and partial states, it is incomplete.

## Responsive And Accessibility Baseline

All tranches with UI must satisfy:

- desktop left-nav shell
- intentional mobile simplification, not blind stacking
- 44px minimum touch targets
- keyboard-complete workflows
- screen-reader-readable assessment progress
- chart meaning not dependent on color only

## Journaling architecture

The original plan treated journaling as a note field. Not good enough.

Journaling needs its own object model:

- `entry_type`
- `title`
- `body`
- `prompt_id`
- `linked_date`
- `linked_event_ids`
- `tags`
- `mood_context`
- `privacy_level`

### Journal entry types

- daily reflection
- morning intention
- evening review
- craving / lapse reflection
- symptom log
- provider visit note
- experiment note
- unstructured freeform

### Why this matters

Without first-class journaling, you cannot tell whether a crash in mood came from sleep debt, conflict, illness, alcohol, or nothing obvious.

That is the whole reason the product exists.

## Assessment architecture

### Recommended cadence

- Daily:
  - mood
  - energy
  - stress
  - focus
  - craving score
- Weekly:
  - WHO-5
- Monthly or on-demand:
  - PHQ-9
  - GAD-7
  - AUDIT-C
- Quarterly optional:
  - full AUDIT

### Assessment schema

Each `AssessmentResult` should store:

- instrument
- version
- completion_timestamp
- recall_window
- total_score
- band
- item_responses
- notes
- recommended_follow_up

### Safety path

If PHQ-9 item 9 is non-zero:

1. show a clear urgent support panel immediately
2. do not hide the result in a chart
3. store the response with a high-risk flag
4. require explicit acknowledgment before proceeding

This app is not a crisis tool. The UX has to say that plainly.

## Integration architecture

## Tier A: implement or scaffold now

- Apple Health XML import
- Day One JSON import
- CSV import
- USDA FoodData Central nutrient enrichment

## Tier B: define interfaces now, build later

- iOS HealthKit companion
- Android Health Connect companion
- Epic/MyChart SMART on FHIR adapter
- Blue Button adapter

## Connector contract

Every connector should implement:

- `canConnect()`
- `requestSetup()`
- `importSnapshot()`
- `incrementalSync()`
- `normalize()`
- `dedupeKey()`
- `provenanceMeta()`

No connector-specific logic should leak into review or UI components.

## Data flow

```text
Source file or OAuth response
        |
        v
  ImportArtifact
        |
        v
  Connector parser
        |
        +--> invalid payload --> import error log --> user-visible issue list
        |
        v
  Normalization
        |
        +--> unit conversion
        +--> timezone reconciliation
        +--> duplicate detection
        +--> patient identity check
        |
        v
  Canonical events
        |
        +--> daily summaries
        +--> timeline
        +--> review aggregates
```

## Production failure scenarios

### Apple Health XML import

Failure:

- timezone parsing shifts midnight entries into the wrong day

Mitigation:

- store both source timestamp and normalized local day
- build import preview before commit

### Day One import

Failure:

- imported journal entries lose media linkage or duplicate on re-import

Mitigation:

- content-hash dedupe
- preserve source identifiers and asset manifests

### FHIR clinical import

Failure:

- records from multiple patients or institutions merge incorrectly

Mitigation:

- require explicit patient identity mapping and source isolation
- do not auto-merge clinical persons silently

### USDA enrichment

Failure:

- branded food match is wrong, nutrient summary becomes nonsense

Mitigation:

- keep user-selected matches editable
- preserve source confidence and manual overrides

## Code Quality Review

## Main issue

The original plan was under-modeled, not over-modeled.

That is rarer. But here it matters.

### What changed from the first plan

1. `notes` became a journal system
2. `health metrics` became health events + clinical records
3. `imports` became adapter-bound ingestion
4. `simple correlations` became deterministic weekly review projections
5. `manual health metrics entry` became explicit assessment and symptom flows

## DRY and explicitness guidance

- One canonical ingestion pipeline, many adapters.
- One canonical event schema, many source types.
- One assessment renderer, many instruments.
- One review engine, many metrics.

Do not create separate parallel storage stacks for Apple, Android, MyChart, and manual data.

That would rot instantly.

## Test Review

## Coverage diagram

```text
CODE PATHS
==========
connector/apple-health-xml
  - parse export.xml
  - validate record shape
  - normalize units
  - preview diff
  - commit import

connector/day-one-json
  - parse archive
  - attach media refs
  - dedupe repeated import

domain/assessments
  - render instrument
  - save partial progress
  - score result
  - classify severity band
  - trigger safety message

domain/review
  - aggregate week
  - compute streaks
  - compute correlations
  - render narrative summary

USER FLOWS
==========
1. Quick daily check-in
2. Write a journal entry linked to a craving
3. Import Apple Health XML and preview changes
4. Import Day One JSON and keep journal chronology
5. Complete PHQ-9 and hit safety branch
6. Log alcohol use and update streak logic
7. Review weekly briefing and choose next-week experiment

FAILURE PATHS
=============
1. duplicate import batch
2. malformed XML
3. malformed JSON
4. FHIR patient mismatch
5. unit mismatch
6. timezone rollover
7. partial import interrupted mid-batch
8. deleted source file after upload start
9. assessment submission with missing answers
10. crisis-adjacent response with no safety UI
```

## Required tests

### Unit

- scoring for PHQ-9, GAD-7, WHO-5, AUDIT-C
- daily streak logic
- correlation calculation thresholds
- dedupe keys
- timezone normalization
- unit conversions

### Integration

- Apple Health XML -> canonical events
- Day One JSON -> journal entries
- USDA lookup -> nutrient attachment
- assessment -> safety flow

### E2E

- complete daily logging loop
- import + preview + commit flow
- weekly review generation
- journal entry linking to same-day events

## Test plan artifact

Primary QA targets:

- Today page
- Journal page
- Assessments page
- Imports page
- Review page

Critical paths:

- import Apple Health XML and verify timeline changes
- import Day One and verify journal chronology
- complete monthly assessment and verify severity tracking
- log lapse / craving and verify sobriety timeline and review summary

## Performance Review

## Main performance risks

1. giant XML or JSON imports on main thread
2. weekly review recomputation on every page load
3. unbounded timeline queries
4. full rescans during dedupe

## Recommendation

- Parse imports in workers.
- Materialize weekly review snapshots instead of recalculating everything every render.
- Index events by day, source, and type.
- Keep raw artifacts compressed or chunked if necessary.

## Storage technology decision

### Recommendation

Choose Dexie now.

Reason:

- standard browser storage
- mature
- Svelte-friendly
- low complexity

### Not in scope

Do not start with:

- PGlite
- Tauri
- Capacitor
- native companions

Those are later moves, not starter moves.

## Failure Modes

| Codepath        | Failure mode                             | Test?    | Error handling? | User sees?                     | Severity |
| --------------- | ---------------------------------------- | -------- | --------------- | ------------------------------ | -------- |
| Apple import    | duplicate import causes duplicate events | required | yes             | import warning                 | High     |
| Apple import    | malformed XML                            | required | yes             | import failure with row count  | Medium   |
| Day One import  | duplicate journal replay                 | required | yes             | duplicate warning              | Medium   |
| Assessments     | missing answers still scored             | required | yes             | inline validation              | High     |
| PHQ-9 flow      | item 9 flagged with no crisis message    | required | yes             | urgent support panel           | Critical |
| Review engine   | timezone skew assigns data to wrong day  | required | yes             | reconciliation banner          | High     |
| FHIR import     | records from wrong person merged         | required | yes             | import blocked                 | Critical |
| Nutrient lookup | wrong branded match                      | required | yes             | confidence and manual override | Medium   |

Critical gaps if omitted:

- PHQ-9 safety path
- patient identity reconciliation
- timezone normalization

## NOT in scope

- live production Epic/MyChart connection in v1
- live HealthKit or Health Connect sync in v1 web app
- provider write-back or Observation.Create in v1
- social features
- cloud sync
- AI therapist or diagnosis
- direct vendor APIs unless one is personally essential

## Parallelization Strategy

| Step                            | Modules touched                         | Depends on                                          |
| ------------------------------- | --------------------------------------- | --------------------------------------------------- |
| app shell + routing             | routes/, ui-shell/, navigation/         | —                                                   |
| local schema + services         | db/, domain/, projections/              | —                                                   |
| journal + assessments           | journal/, assessments/, safety/         | local schema                                        |
| sobriety + daily check-in       | today/, sobriety/, domain/              | local schema                                        |
| food logging + USDA integration | nutrition/, integrations/usda/, domain/ | local schema                                        |
| imports pipeline                | imports/, connectors/, workers/         | local schema                                        |
| weekly review                   | review/, projections/, analytics/       | local schema, journal, sobriety, nutrition, imports |

### Parallel lanes

- Lane A: app shell -> local schema
- Lane B: journal + assessments
- Lane C: sobriety + daily check-in
- Lane D: food logging + USDA
- Lane E: imports pipeline
- Lane F: weekly review

### Execution order

Launch A first.

Then B + C + D + E in parallel.

Then F after B/C/D/E land because review depends on all of them.

### Conflict flags

- B, C, D, and E all touch `domain/` contracts. Shared schema package needed first.
- F touches projections fed by every other lane. Keep it last.

## Completion Summary

- Step 0: scope accepted, but deepened
- Architecture Review: 4 core issues fixed in this revised plan
- Code Quality Review: 3 modeling issues fixed
- Test Review: coverage diagram produced, major gaps identified
- Performance Review: 4 risks identified with mitigations
- NOT in scope: written
- What already exists: written
- Failure modes: 3 critical gaps flagged if omitted
- Parallelization: 6 lanes, 4 parallel after foundation
- Lake Score: complete option chosen on storage, connectors, journaling, and safety

## Final Recommendation

Build the product as a local-first SvelteKit app with Dexie, first-class journaling, structured assessments, and adapter-based imports.

Do not chase direct live integrations first.

Build the system that can absorb them cleanly.

Then add Apple Health XML, Day One, and USDA.

After that, native Apple Health / Health Connect companions.

Then clinical FHIR.

That is the world-class path that still ships.

For the tranche-by-tranche execution detail, use:

- [2026-04-02-personal-health-cockpit-tranche-plan.md](2026-04-02-personal-health-cockpit-tranche-plan.md)
