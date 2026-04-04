# Personal Health Cockpit Implementation Packet: T0 + T1

Status: Active
Date: 2026-04-02
Parent:
- `docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md`
- `docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md`
- `DESIGN.md`

## Purpose

This is the first build packet.

It exists so implementation can start without re-litigating folder structure, schema shape, or what “good” means for the foundation.

This packet covers only:

- `T0` Foundation + repo skeleton
- `T1` Local data layer + event contracts

No product logic beyond what is required to prove the shell and schema.

## Scope

### In scope

- SvelteKit app bootstrap
- TypeScript and lint/test config
- route skeletons
- shared shell
- core domain types
- Dexie database bootstrap
- schema version 1
- repositories and validation helpers
- seed fixtures
- baseline tests

### Out of scope

- real Today interactions
- journal CRUD
- sobriety logic
- assessments
- imports
- correlations
- charts

## Preferred Setup Path

Use the official SvelteKit path first, then add only the libraries this product actually needs.

### Scaffold

```bash
npx sv create .
```

### Add testing

```bash
npx sv add vitest=\"usages:unit,component\"
npx sv add playwright
```

### Add core app libraries

```bash
npm install dexie bits-ui lucide-svelte @testing-library/user-event
```

### Why this setup

- it matches official 2026 SvelteKit project structure and testing guidance
- it gives you Vitest for unit and component testing
- it gives you Playwright for browser smoke and E2E flows
- it keeps the primitive layer accessible without pre-baking a generic visual style

## File Plan

### Root

```text
package.json
tsconfig.json
vite.config.ts
svelte.config.js
eslint.config.js
vitest.config.ts
playwright.config.ts
src/
static/
tests/
docs/
DESIGN.md
```

### App structure

```text
src/
  app.html
  routes/
    +layout.svelte
    +page.svelte
    today/+page.svelte
    journal/+page.svelte
    nutrition/+page.svelte
    sobriety/+page.svelte
    assessments/+page.svelte
    timeline/+page.svelte
    review/+page.svelte
    imports/+page.svelte
    integrations/+page.svelte
    settings/+page.svelte

  lib/
    ui/
      shell/
        AppShell.svelte
        SideNav.svelte
        MobileNav.svelte
        SectionHeader.svelte
      primitives/
        Button.svelte
        Field.svelte
        Card.svelte
        Sheet.svelte
        EmptyState.svelte
        StatusBanner.svelte

    domain/
      types.ts
      events.ts
      validation.ts
      time.ts

    db/
      client.ts
      schema.ts
      seed.ts
      migrations.ts
      repositories/
        daily-records.ts
        journal-entries.ts
        food-entries.ts
        health-events.ts
        sobriety-events.ts
        assessments.ts
        import-batches.ts
        import-artifacts.ts
        review-snapshots.ts

    services/
      bootstrap/
        app-bootstrap.ts

    utils/
      ids.ts
      dates.ts
      serialization.ts
```

### Test structure

```text
tests/
  unit/
    domain/
      validation.test.ts
      time.test.ts
    db/
      schema.test.ts
      serialization.test.ts
  component/
    shell/
      app-shell.test.ts
      mobile-nav.test.ts
      page-title.test.ts
      side-nav.test.ts
  e2e/
    shell-navigation.spec.ts
```

## Design Decisions Locked For T0/T1

These are no longer open questions.

### Approved visual directions

- Today: `variant-B`
- Journal: `variant-A`
- Review: `variant-B`

Reference paths:

- `/home/pyro1121/.gstack/projects/Health/designs/today-20260402/variant-B.png`
- `/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/variant-A.png`
- `/home/pyro1121/.gstack/projects/Health/designs/review-20260402/variant-B.png`

### Mobile nav

Use bottom navigation with:

- Today
- Journal
- Review
- More

Everything else lives under More for mobile in v1.

### Chart grammar

For later tranches, charts should default to:

- 2px primary data lines
- warm neutral background
- faint horizontal grid only, 10-12% opacity
- pine as primary trend
- brass for annotations and callouts
- no stacked rainbow palette
- no radial summary charts

### Icon system

Use `lucide-svelte`.

Why:

- clean line icons
- low ornament
- broad coverage
- fits the calm operating-system feel

## Required Package Scripts

`package.json` should include at least:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

## Route Requirements

### `src/routes/+layout.svelte`

Responsibilities:

- apply app shell
- inject navigation
- provide global spacing and content container
- preserve a stable layout between pages

Must not:

- own domain logic
- fetch health data directly

### Route placeholders

Each route page in T0 should:

- render a page title
- set a unique `<svelte:head><title>`
- render one-sentence purpose
- use the shared shell and spacing
- not invent its own layout pattern

### Accessibility baseline

The shell and route skeleton must provide:

- one obvious nav landmark
- one obvious main landmark
- focus-visible states
- keyboard-reachable primary navigation

## Domain Contracts

## Base types

Every persisted entity must include:

- `id: string`
- `createdAt: string`
- `updatedAt: string`

Every event-shaped record must include:

- `sourceType`
- `sourceApp`
- `sourceRecordId`
- `sourceTimestamp`
- `localDay`
- `timezone`
- `confidence`

## Canonical entity sketch

```ts
type RecordId = string;
type IsoDateTime = string;
type LocalDay = string; // YYYY-MM-DD

interface BaseRecord {
  id: RecordId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

interface Provenance {
  sourceType: "manual" | "import" | "derived" | "native-companion";
  sourceApp: string;
  sourceRecordId?: string;
  sourceTimestamp?: IsoDateTime;
  localDay: LocalDay;
  timezone?: string;
  confidence: number;
}
```

## DailyRecord v1

```ts
interface DailyRecord extends BaseRecord {
  date: LocalDay;
  mood?: number;
  energy?: number;
  stress?: number;
  focus?: number;
  sleepHours?: number;
  sleepQuality?: number;
  freeformNote?: string;
}
```

## JournalEntry v1

```ts
interface JournalEntry extends BaseRecord {
  entryType:
    | "freeform"
    | "morning_intention"
    | "evening_review"
    | "craving_reflection"
    | "lapse_reflection"
    | "symptom_note"
    | "experiment_note"
    | "provider_visit_note";
  localDay: LocalDay;
  title?: string;
  body: string;
  tags: string[];
  linkedEventIds: string[];
}
```

## HealthEvent v1

```ts
interface HealthEvent extends BaseRecord, Provenance {
  eventType: string;
  value?: number | string | boolean;
  unit?: string;
  payload?: Record<string, unknown>;
}
```

## Repository Contract

Repositories must:

- hide raw Dexie queries from route components
- accept typed input
- return typed output
- centralize serialization concerns

Do not let pages call Dexie tables directly.

## Dexie Schema v1

### Database name

- `personal-health-cockpit`

### Version 1 tables

```ts
db.version(1).stores({
  dailyRecords: "id, date, updatedAt",
  journalEntries: "id, localDay, entryType, updatedAt",
  foodEntries: "id, localDay, mealType, updatedAt",
  healthEvents: "id, localDay, eventType, sourceType, updatedAt",
  sobrietyEvents: "id, localDay, eventType, updatedAt",
  assessmentResults: "id, localDay, instrument, updatedAt",
  importBatches: "id, sourceType, status, createdAt",
  importArtifacts: "id, batchId, artifactType, createdAt",
  reviewSnapshots: "id, weekStart, updatedAt"
});
```

## Seed Strategy

T0/T1 should include one deterministic local seed fixture set for:

- one clean first-time user state
- one moderately populated user state

Use a dev-only seed path. Do not auto-seed production.

## Validation Rules

### Scalar rules

- score scales are clamped
- `localDay` must be `YYYY-MM-DD`
- dates are normalized before persistence
- confidence is `0..1`

### Shape rules

- required fields fail loudly
- unknown entity fields are dropped or rejected deliberately
- no silent coercion from invalid strings to numbers

## Tests Required In This Packet

### Unit

- `validation.test.ts`
  - score bounds
  - invalid local day
  - invalid confidence
- `time.test.ts`
  - source timestamp -> local day normalization
  - timezone edge cases around midnight
- `schema.test.ts`
  - db opens
  - all tables present
  - version 1 migration works
- `serialization.test.ts`
  - repository round-trip integrity

### Component

- `app-shell.test.ts`
  - shell renders nav and slot
- `side-nav.test.ts`
  - correct primary nav order
  - active route state
- `mobile-nav.test.ts`
  - Today / Journal / Review / More visible
- `page-title.test.ts`
  - each route placeholder sets a unique page title

### E2E

- `shell-navigation.spec.ts`
  - app boots
  - primary pages are reachable
  - layout remains stable across nav
  - route title updates on navigation

## Acceptance Criteria

### T0 accepted when

- route skeleton exists
- app shell matches `DESIGN.md`
- mobile nav is decided and implemented
- lint, typecheck, unit tests, and E2E shell smoke pass

### T1 accepted when

- Dexie schema is live
- repositories exist for all primary entities
- canonical event/provenance contract is typed
- timezone and serialization tests are green

## Failure Modes

| Area | Failure | Mitigation |
|---|---|---|
| layout shell | route-specific layout drift | single shell owner in `+layout.svelte` |
| db schema | schema impossible to evolve | versioned migration file from day one |
| timestamps | events assigned to wrong day | source timestamp + local day stored together |
| repositories | pages reach into tables directly | repository-only data access rule |
| seeds | fake fixture shape diverges from real contracts | typed fixture builders |

## What Good Looks Like

At the end of T0/T1:

- the repo looks inevitable
- design and architecture docs point to the same structure
- later tranches can slot into obvious directories
- the data model is boring in the best way

No heroics. No reinvention. No cleverness tax.

## Next Packet

After this packet, the next implementation packet should cover:

- `T2` Today experience
- `T3` Journal system

Those are the first two user-visible tranches that make the product feel real.
