# Personal Health Cockpit Tranche Plan

Status: Active
Date: 2026-04-02
Parent: `docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md`
Framework: SvelteKit
Storage: Dexie / IndexedDB
Design system: `DESIGN.md`
Visual spec: `docs/designs/2026-04-02-personal-health-cockpit-visual-spec.md`
Implementation packet: `docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md`

## What This Doc Is

The engineering plan explains what the system should be.

This doc explains how to land it tranche by tranche without the whole thing turning into sludge.

Each tranche is meant to be:

- internally coherent
- testable on its own
- shippable on its own
- reversible if it goes wrong

That is the whole point.

## Tranche Rules

1. No tranche should depend on an unshipped fantasy tranche.
2. Every tranche must improve the product for you personally.
3. Every tranche must leave the data model cleaner than it found it.
4. Every tranche gets explicit exit criteria.
5. Every tranche gets failure modes and tests before implementation.

## Delivery Sequence

```text
T0  Foundation + repo skeleton
T1  Local data layer + event contracts
T2  Today experience + daily record
T3  Journal system
T4  Sobriety tracking
T5  Assessments + safety flows
T6  Nutrition + recurring meals + USDA enrichment
T7  Import center + Apple Health XML + Day One JSON
T8  Weekly review + correlations + experiments
T9  Native companions (HealthKit / Health Connect)
T10 Clinical / payer interoperability (SMART on FHIR / Blue Button)
```

## Dependency Graph

```text
T0 -> T1 -> T2
          -> T3
          -> T4
          -> T5
          -> T6
          -> T7

T2 + T3 + T4 + T5 + T6 + T7 -> T8
T8 -> T9
T8 -> T10
```

## T0: Foundation + Repo Skeleton

### Goal

Create a sane project shape so every later tranche lands into obvious places.

### Why this exists

Without T0, you start feature-building directly into route files and random stores. Then by T4 the whole repo is lying to you.

### In scope

- SvelteKit project bootstrap
- TypeScript configuration
- linting / formatting
- route skeleton
- design token / layout skeleton
- basic test harness
- doc structure

### Out of scope

- real persistence
- real health logic
- imports
- charts

### Target modules

```text
src/
  lib/
    domain/
    db/
    services/
    connectors/
    workers/
    ui/
    utils/
  routes/
    today/
    journal/
    nutrition/
    sobriety/
    assessments/
    timeline/
    review/
    imports/
    integrations/
    settings/
```

### Deliverables

- app shell
- nav
- empty route screens
- testing setup
- placeholder seed fixtures
- `DESIGN.md` added and linked from plan docs

### Acceptance criteria

- app boots locally
- every route renders a stable placeholder
- CI can run lint and tests
- no route contains domain logic yet
- visual and interaction rules live in one shared design system doc

### Failure modes

| Failure                            | Why it matters              | Mitigation                  |
| ---------------------------------- | --------------------------- | --------------------------- |
| route structure drifts immediately | later tranches collide      | lock folder conventions now |
| testing setup is deferred          | coverage becomes fake later | install test harness in T0  |
| UI shell becomes bespoke per page  | future polish cost explodes | build one shared shell now  |

### Tests

- route smoke tests
- shell render test
- nav active-state test
- lint / typecheck in CI

### Exit criteria

You can point to a folder and know where the next tranche belongs before writing any feature logic.

## T1: Local Data Layer + Event Contracts

### Goal

Establish the canonical local schema and event model.

### Why this exists

This is the tranche that prevents every integration from inventing its own storage format.

### In scope

- Dexie setup
- versioned schema
- table definitions
- canonical event types
- import artifact storage
- projections contract

### Out of scope

- polished UI
- full importers
- review analytics

### Primary entities

- `DailyRecord`
- `JournalEntry`
- `FoodEntry`
- `HealthEvent`
- `SobrietyEvent`
- `AssessmentResult`
- `ImportBatch`
- `ImportArtifact`
- `ReviewSnapshot`

### Required design decisions

#### Canonical event contract

Every imported or manual datum must carry:

- source
- source record id
- timestamp
- local day
- type
- payload
- provenance
- confidence

#### Table split

Do not over-normalize into fifteen tables for v1.

Do not under-model into one JSON blob either.

Use a hybrid:

- explicit high-value tables for UX-critical objects
- event payload flexibility where source formats vary

### Deliverables

- Dexie database class
- schema migrations
- repository access layer
- typed DTOs
- domain validation helpers

### Acceptance criteria

- manual and imported records can share the same canonical envelope
- schema can version forward without destructive reset
- all domain objects serialize and deserialize deterministically

### Failure modes

| Failure                | Why it matters                         | Mitigation                                       |
| ---------------------- | -------------------------------------- | ------------------------------------------------ |
| timestamp/day mismatch | review summaries become untrustworthy  | persist both source timestamp and normalized day |
| schema too rigid       | imports become impossible              | flexible payload fields with typed projections   |
| schema too loose       | app logic becomes stringly-typed chaos | typed repositories and validators                |

### Tests

- schema migration tests
- serialization round-trip tests
- timezone normalization tests
- confidence/provenance persistence tests

### Exit criteria

No later tranche needs to invent storage.

## T2: Today Experience + Daily Record

### Goal

Ship the first page you can actually use every day.

### User outcome

In under 30 seconds, you can log the state of your day without opening three other apps.

### In scope

- Today page
- quick check-in
- mood / energy / stress / focus
- sleep hours + sleep quality manual entry
- freeform day note stub
- same-day event list

### Out of scope

- long-form journaling
- assessments
- imports
- correlations

### UI sections

```text
Today
|
|-- Quick check-in card
|-- Sleep card
|-- Quick sobriety status placeholder
|-- Today note stub
|-- Today's events stream
```

### Data touched

- `DailyRecord`
- `HealthEvent` for quick metrics

### Services

- `saveDailyCheckin`
- `getTodaySnapshot`
- `listEventsForDay`

### Key edge cases

- first ever day, no data
- editing same day multiple times
- crossing midnight while app is open
- accidental duplicate submit

### Acceptance criteria

- daily check-in is usable on mobile and desktop
- repeated edits are idempotent
- the page opens in under one second with local data
- empty state does not feel broken
- hierarchy matches the Today screen rules in `DESIGN.md`

### Failure modes

| Failure                            | User sees                             | Test? |
| ---------------------------------- | ------------------------------------- | ----- |
| stale day after midnight           | wrong day header / wrong write target | yes   |
| duplicate click saves twice        | duplicated events                     | yes   |
| empty first-use state looks broken | abandonment                           | yes   |

### Tests

- component tests for empty / partial / full state
- integration test for save-edit-save loop
- midnight rollover unit test
- E2E for quick daily check-in

### Exit criteria

You can use the app every morning and night, even before other tranches exist.

## T3: Journal System

### Goal

Turn notes into a first-class narrative layer linked to your health events.

### User outcome

You can write what happened, not just what was measured.

### In scope

- Journal route
- create/edit/delete entry
- entry types
- tags
- link entry to date and related events
- optional prompts for morning/evening reflection

### Out of scope

- imports
- media-heavy attachments
- AI summarization

### Entry types

- freeform
- morning intention
- evening review
- craving reflection
- lapse reflection
- symptom note
- experiment note
- provider visit note

### Services

- `createJournalEntry`
- `updateJournalEntry`
- `listJournalEntriesForDay`
- `linkJournalEntryToEvents`

### Data touched

- `JournalEntry`
- link references into `HealthEvent`, `SobrietyEvent`, `FoodEntry`

### Acceptance criteria

- long-form entry writing feels clean, not cramped
- entries can be linked to same-day events
- the Today page can show journal excerpts without duplicating data
- writing surface follows the calmer editorial treatment defined in `DESIGN.md`

### Failure modes

| Failure                        | Why it matters                            | Mitigation                      |
| ------------------------------ | ----------------------------------------- | ------------------------------- |
| journal is just a string field | cannot support import, linking, or search | dedicated entity                |
| event links break on delete    | dangling context                          | soft-delete or link cleanup     |
| prompt UX is noisy             | journaling becomes avoidance              | prompts optional, not mandatory |

### Tests

- CRUD tests
- linked event integrity tests
- prompt optionality tests
- E2E for creating and revisiting an entry

### Exit criteria

The app now captures narrative context, not just metrics.

## T4: Sobriety Tracking

### Goal

Track sobriety as a recovery system, not a streak widget.

### User outcome

You can log sober days, lapses, cravings, triggers, and recovery actions without the app making you feel judged.

### In scope

- sobriety status
- streak calculation
- cravings
- trigger tags
- lapse reflection flow
- recovery action logging

### Out of scope

- public sharing
- sponsor contact workflows
- treatment recommendations

### Services

- `setSobrietyStatusForDay`
- `logCravingEvent`
- `logLapseEvent`
- `calculateCurrentStreak`
- `buildSobrietyTrendSummary`

### Data touched

- `SobrietyEvent`
- `DailyRecord`

### Key UX decisions

- sober / not sober is not enough
- lapse UX must preserve dignity
- cravings should be loggable in under 10 seconds

### Acceptance criteria

- sober streak updates correctly after edits
- craving flow is fast
- lapse reflection captures context and next-step actions
- sobriety events appear in timeline and weekly review inputs
- lapse and craving flows avoid punitive or gamified language

### Failure modes

| Failure                       | User impact                    | Test? |
| ----------------------------- | ------------------------------ | ----- |
| streak breaks on edits        | trust destroyed                | yes   |
| lapse note not linked to date | review insight becomes useless | yes   |
| craving logging is too heavy  | user stops using it            | yes   |

### Tests

- streak calculation permutations
- lapse correction and backfill tests
- E2E for craving + lapse + recovery flow

### Exit criteria

The app is useful for sobriety even before imports or advanced analytics land.

## T5: Assessments + Safety Flows

### Goal

Support structured assessment history without drifting into fake clinical certainty.

### User outcome

You can complete validated instruments cleanly, track change over time, and get safety messaging when needed.

### In scope

- assessments route
- instrument renderer
- PHQ-9
- GAD-7
- WHO-5
- AUDIT-C
- severity bands
- safety UI

### Out of scope

- diagnostic claims
- emergency response workflows
- provider messaging

### Services

- `renderAssessment`
- `saveAssessmentProgress`
- `scoreAssessment`
- `classifyAssessmentBand`
- `handleHighRiskAssessmentState`

### Data touched

- `AssessmentResult`

### Safety-critical requirements

If PHQ-9 item 9 is non-zero:

- show urgent support information immediately
- require acknowledgment
- record high-risk metadata
- avoid reducing the response to just a score chart

### Acceptance criteria

- instruments are versioned
- partial progress can be resumed
- scoring is deterministic
- safety branch is tested and obvious in UX
- safety-sensitive copy and visual hierarchy follow `DESIGN.md`

### Failure modes

| Failure                           | Severity | Mitigation                 |
| --------------------------------- | -------- | -------------------------- |
| wrong score band                  | High     | table-driven scoring tests |
| partial responses scored as final | High     | validation gate            |
| item 9 response buried            | Critical | dedicated safety component |

### Tests

- table-driven unit tests per instrument
- incomplete assessment validation tests
- safety branch integration tests
- E2E for monthly assessment completion

### Exit criteria

Assessment history is trustworthy and safety handling is explicit.

## T6: Nutrition + Recurring Meals + USDA Enrichment

### Goal

Make food logging reliable, fast, and useful for review.

### User outcome

You can log food quickly enough to keep doing it, and the nutrition data is deep enough to matter.

### In scope

- nutrition route
- manual food entry
- recurring meals
- favorite foods
- nutrient summary
- USDA lookup/enrichment
- manual override of wrong matches

### Out of scope

- barcode scanning
- OCR meal parsing
- restaurant delivery integrations

### Services

- `createFoodEntry`
- `reuseRecurringMeal`
- `searchFoodData`
- `attachNutrientsToFoodEntry`
- `buildDailyNutritionSummary`

### Data touched

- `FoodEntry`
- nutrient enrichment metadata on food items

### Acceptance criteria

- recurring meals can be logged in one tap
- bad USDA matches can be corrected
- daily calories / protein / fiber summaries are stable
- nutrition events feed review calculations
- nutrition UI avoids dashboard-card soup and preserves quick logging speed

### Failure modes

| Failure                  | Why it matters               | Mitigation                   |
| ------------------------ | ---------------------------- | ---------------------------- |
| wrong food match         | destroys trust               | user-selectable override     |
| recurring meal drift     | macros become stale silently | version recurring meals      |
| excessive search latency | logging becomes annoying     | cache recent lookups locally |

### Tests

- food search selection tests
- recurring meal replay tests
- macro calculation tests
- override persistence tests
- E2E for log same breakfast repeatedly

### Exit criteria

Food logging is fast enough to survive normal life.

## T7: Import Center + Apple Health XML + Day One JSON

### Goal

Start consolidating existing history without corrupting the local model.

### User outcome

You can import prior health and journal history, preview the changes, and trust the result.

### In scope

- import center UI
- import batch history
- preview diff
- Apple Health XML parser
- Day One JSON parser
- CSV parser base
- dedupe rules
- import error reporting

### Out of scope

- live sync
- background scheduled sync
- FHIR OAuth

### Services

- `createImportBatch`
- `parseAppleHealthXml`
- `parseDayOneExport`
- `previewImport`
- `commitImportBatch`
- `dedupeImportedEvents`

### Worker responsibilities

- parse large files
- normalize records
- emit staged artifacts

### Acceptance criteria

- large import does not freeze UI
- preview shows adds / updates / duplicates
- re-import is idempotent
- import errors are actionable
- import states follow the explicit loading / partial / error patterns in `DESIGN.md`

### Failure modes

| Failure                        | Severity | Mitigation                                   |
| ------------------------------ | -------- | -------------------------------------------- |
| XML timezone shift             | High     | preserve source timestamp + normalized day   |
| duplicate imports replay data  | High     | content hash + source ids                    |
| malformed archive half-imports | High     | staged batch commit, not streaming writes    |
| Day One media links break      | Medium   | preserve manifest refs even if media missing |

### Tests

- parser fixture tests
- idempotent re-import tests
- preview diff snapshot tests
- worker cancellation tests
- E2E import preview -> commit

### Exit criteria

Imported history lands cleanly enough that you would trust the timeline.

## T8: Weekly Review + Correlations + Experiments

### Goal

Turn all collected data into a weekly briefing that changes behavior.

### User outcome

At the end of the week, the app tells you what moved, what drifted, and what to try next.

### In scope

- weekly review route
- deterministic weekly aggregates
- streaks
- trend summaries
- simple correlations
- experiment proposal + tracking
- manual reflection on the week

### Out of scope

- AI-generated therapy language
- black-box scoring
- causal claims you cannot justify

### Services

- `buildWeeklySnapshot`
- `computeTrendComparisons`
- `computeCorrelations`
- `generateReviewFlags`
- `saveNextWeekExperiment`

### Data touched

- `ReviewSnapshot`
- derived projections from all previous tranches

### Acceptance criteria

- weekly review renders from local data only
- correlation engine is explainable
- each insight can be traced back to source data
- experiments can be declared and reviewed the next week
- weekly review feels like a calm briefing, not a noisy metrics wall

### Failure modes

| Failure                 | User impact          | Mitigation                         |
| ----------------------- | -------------------- | ---------------------------------- |
| noisy fake correlations | product feels stupid | thresholding + minimum sample size |
| recompute too slow      | review page drags    | materialized snapshots             |
| insight not traceable   | trust collapses      | source-linked drilldown            |

### Tests

- aggregate correctness tests
- correlation threshold tests
- traceability tests
- E2E weekly review journey

### Exit criteria

The product can finally answer: what helped, what hurt, what drifted, what next.

## T9: Native Companions (HealthKit / Health Connect)

### Goal

Reduce manual logging burden by connecting the web app to native health aggregators.

### User outcome

Your app starts receiving cleaner upstream wellness data without becoming cloud-first.

### In scope

- iOS companion app proof of concept
- Android companion app proof of concept
- HealthKit reader path
- Health Connect reader path
- local export or bridge into web app

### Out of scope

- cloud account sync
- full bidirectional writes
- App Store / Play Store launch polish

### Architectural rule

The web app remains the product center.

Native companions are collectors and permission brokers.

### Acceptance criteria

- one useful HealthKit ingestion path works
- one useful Health Connect ingestion path works
- provenance remains clear
- no silent overwrite of web-entered data

### Failure modes

- permission revoked mid-sync
- duplicate source events from aggregator + manual entry
- bridge payload version mismatch

### Tests

- adapter contract tests
- bridge format tests
- duplicate reconciliation tests

### Exit criteria

You have validated the native bridge approach without making the product depend on it.

## T10: Clinical / Payer Interoperability

### Goal

Bring in medical and claims history through standards-based patient-authorized data access.

### User outcome

You can see clinically meaningful history in the same personal timeline, without scraping portals.

### In scope

- SMART on FHIR design
- Epic/MyChart patient-facing proof of concept
- Blue Button proof of concept if relevant
- patient identity reconciliation
- clinical event normalization

### Out of scope

- provider write-back
- production support for every institution
- scheduling, messaging, billing workflows

### Major risk

This tranche has the highest blast radius for bad identity handling.

Do not auto-merge clinical persons or institutions casually.

### Acceptance criteria

- one provider-grade connection can be demonstrated
- clinical events remain source-scoped
- import can be blocked safely on identity ambiguity

### Failure modes

| Failure                                  | Severity | Mitigation                           |
| ---------------------------------------- | -------- | ------------------------------------ |
| wrong person merge                       | Critical | explicit identity mapping gate       |
| partial FHIR support across institutions | High     | connector capability matrix          |
| OAuth onboarding pain                    | Medium   | staged setup UX and institution docs |

### Tests

- identity mismatch tests
- clinical resource normalization tests
- adapter capability tests
- end-to-end sandbox connection test

### Exit criteria

Clinical interoperability works in one narrow lane without poisoning the rest of the product.

## Cross-Tranche Acceptance Gates

These apply to every tranche.

### Product gate

- does this make the app more useful this week, not just more impressive on paper?

### Data gate

- does source provenance remain intact?

### UX gate

- can the user understand what happened after success and failure?

### Test gate

- are all new happy paths, edge cases, and failure paths covered?

### Performance gate

- does the tranche keep primary pages feeling instant with realistic local data volume?

## Where To Put Inline ASCII Diagrams In The Code

When implementation starts, these files or modules should get inline ASCII comments:

- `src/lib/db/schema.ts`
  - entity relationships and migration notes
- `src/lib/services/import/*`
  - parse -> validate -> normalize -> dedupe -> commit pipeline
- `src/lib/services/review/*`
  - weekly aggregate flow and correlation thresholds
- `src/lib/services/assessments/*`
  - scoring + safety branch
- `src/lib/services/sobriety/*`
  - streak recalculation and lapse handling
- `src/routes/review/+page.svelte`
  - review composition and drilldown flow if it gets complex

## Recommended First Three Tranches To Actually Build

1. T0
2. T1
3. T2

Then either:

- T3 + T4 + T5 if you want the emotional / behavioral core first
- T6 + T7 if food and history import are more urgent

My recommendation:

Build T3 and T5 before T6.

Why:

Journaling and assessments are central to the product being meaningfully personal. Food data without narrative and assessment context is useful, but not yet world-class.

## Final Recommendation

Do not think of this as "Phase 1, 2, 3."

Think of it as:

- foundation
- self-reporting loop
- evidence import
- weekly intelligence
- ecosystem expansion

That sequencing gives you a product that becomes more true over time instead of more complicated.
