# Data Model

Status: Active  
Date: 2026-04-10

This file documents the live local-first data model.

Use it when you need to answer:

- which table owns which record type
- which records are source-of-truth vs derived
- what gets refreshed when a mutation lands
- which features share data dependencies

## Storage Model

The app stores structured data locally first, but the live runtime now writes through the server-side Bun SQLite / Drizzle mirror.

```text
Bun SQLite / Drizzle mirror tables
  -> canonical records
  -> imported artifacts and batches
  -> derived weekly review snapshots
  -> derived adherence matches

in-memory test tables
  -> unit and component test execution only
```

Core sources:

- [src/lib/core/db/schema.ts](/home/pyro1121/Documents/Health/src/lib/core/db/schema.ts)
- [src/lib/core/db/types.ts](/home/pyro1121/Documents/Health/src/lib/core/db/types.ts)
- [src/lib/core/domain/types.ts](/home/pyro1121/Documents/Health/src/lib/core/domain/types.ts)

## Table Inventory

### Daily records

Table:

- `dailyRecords`

Record:

- `DailyRecord`

Purpose:

- one row per local day for daily check-in metrics
- mood, energy, stress, focus, sleep, note

Primary feature owners:

- today
- review

### Journal entries

Table:

- `journalEntries`

Record:

- `JournalEntry`

Purpose:

- daily narrative layer
- linked event IDs for context-aware journaling

Primary feature owners:

- journal
- review

### Food entries

Table:

- `foodEntries`

Record:

- `FoodEntry`

Purpose:

- logged meals for a local day
- nutrition summary source-of-truth

Primary feature owners:

- nutrition
- today
- review

### Food catalog items

Table:

- `foodCatalogItems`

Record:

- `FoodCatalogItem`

Purpose:

- local food catalog
- custom foods
- cached packaged/Open Food Facts items
- cached USDA enrich results

Primary feature owners:

- nutrition
- planning
- today

### Recipe catalog items

Table:

- `recipeCatalogItems`

Record:

- `RecipeCatalogItem`

Purpose:

- local cache of recipe entities
- planning and grocery derivation input

Primary feature owners:

- nutrition
- planning
- groceries
- review

### Weekly plans

Table:

- `weeklyPlans`

Record:

- `WeeklyPlan`

Purpose:

- one weekly planning container per week start

Primary feature owners:

- plan
- groceries
- review

### Plan slots

Table:

- `planSlots`

Record:

- `PlanSlot`

Purpose:

- per-day weekly plan items
- meals, workouts, notes

Primary feature owners:

- plan
- today
- groceries
- review
- nutrition planned-meal resolution

### Derived grocery items

Table:

- `derivedGroceryItems`

Record:

- `DerivedGroceryItem`

Purpose:

- grocery rows derived from recipe-backed plan slots

Primary feature owners:

- groceries
- planning
- review

### Manual grocery items

Table:

- `manualGroceryItems`

Record:

- `ManualGroceryItem`

Purpose:

- user-added grocery rows layered on top of derived rows

Primary feature owners:

- groceries
- planning

### Workout templates

Table:

- `workoutTemplates`

Record:

- `WorkoutTemplate`

Purpose:

- reusable workout plans

Primary feature owners:

- movement
- planning
- today

### Exercise catalog items

Table:

- `exerciseCatalogItems`

Record:

- `ExerciseCatalogItem`

Purpose:

- cached exercise search results

Primary feature owners:

- movement
- planning

### Favorite meals

Table:

- `favoriteMeals`

Record:

- `FavoriteMeal`

Purpose:

- reusable recurring meals

Primary feature owners:

- nutrition

### Health events

Table:

- `healthEvents`

Record:

- `HealthEvent`

Purpose:

- normalized event timeline across manual, import, and native-companion sources

Primary feature owners:

- health
- today
- timeline
- review
- imports

### Health templates

Table:

- `healthTemplates`

Record:

- `HealthTemplate`

Purpose:

- reusable medication/supplement templates

Primary feature owners:

- health

### Sobriety events

Table:

- `sobrietyEvents`

Record:

- `SobrietyEvent`

Purpose:

- sober/recovery status, craving, lapse context

Primary feature owners:

- sobriety
- review

### Assessment results

Table:

- `assessmentResults`

Record:

- `AssessmentResult`

Purpose:

- saved assessment progress and completed results

Primary feature owners:

- assessments
- review

### Import batches

Table:

- `importBatches`

Record:

- `ImportBatch`

Purpose:

- staged and committed import lifecycle

Primary feature owners:

- imports
- integrations

### Import artifacts

Table:

- `importArtifacts`

Record:

- `ImportArtifact`

Purpose:

- staged per-record import payloads prior to commit

Primary feature owners:

- imports

### Review snapshots

Table:

- `reviewSnapshots`

Record:

- `ReviewSnapshot`

Purpose:

- materialized weekly review outputs

Primary feature owners:

- review

### Adherence matches

Table:

- `adherenceMatches`

Record:

- `AdherenceMatch`

Purpose:

- per-slot inferred or direct adherence evidence

Primary feature owners:

- review
- planning

## Canonical Vs Derived Data

```text
canonical:
  dailyRecords
  journalEntries
  foodEntries
  foodCatalogItems
  recipeCatalogItems
  weeklyPlans
  planSlots
  workoutTemplates
  exerciseCatalogItems
  favoriteMeals
  healthEvents
  healthTemplates
  sobrietyEvents
  assessmentResults
  importBatches
  importArtifacts

derived / materialized:
  derivedGroceryItems
  reviewSnapshots
  adherenceMatches
```

Rule:

- if a record can be recomputed from canonical data, prefer recomputing or materializing it as derived data
- if a record is user intent or source evidence, treat it as canonical

## Provenance Model

Health events are the strongest example of normalized provenance:

```text
HealthEvent
  sourceType
  sourceApp
  sourceRecordId
  sourceTimestamp
  localDay
  timezone
  connector / connectorVersion / deviceId
  confidence
```

This is why:

- imports can be deduped
- timeline can merge manual and imported events
- review can reason over cross-source evidence

## Review Refresh Dependencies

These mutations can change weekly review output:

- today check-ins
- food entries
- planned meals / plan slots
- grocery state
- health events
- sobriety events
- assessment progress / submit
- journal saves
- import commits

If you touch any of those mutation paths, assume review regressions are possible.

## Safe Change Heuristics

### Safe

- move an import from a barrel to the real owner
- extract a local helper for repeated feature-local mutation orchestration
- extract a small shared helper for clearly shared domain behavior

### Risky

- change canonical record shape without updating every consumer
- change derived refresh timing without review regressions
- merge canonical and derived concerns into one table
- remove provenance fields from imported or native-companion data

## Data Flow Diagram

```text
user action
  -> feature action/controller
  -> canonical table mutation
  -> optional derived refresh
      -> derivedGroceryItems
      -> adherenceMatches
      -> reviewSnapshots
  -> page reload / state update
```

That separation matters. Canonical data is what happened. Derived data is our interpretation.

## Docs Rule

If you change:

- a table name
- a record shape
- canonical vs derived ownership
- review refresh dependencies

then update this file in the same tranche.
