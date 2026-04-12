# World-Class Forward Plan

Status: Historical Foundation
Date: 2026-04-12
Superseded by:

- `docs/designs/2026-04-12-bleeding-edge-health-os-plan.md`
  Basis:
- `ARCHITECTURE.md`
- `docs/api-reference.md`
- `docs/data-model.md`
- `docs/feature-flows.md`
- `docs/external-data-sources.md`
- `docs/health-cockpit-whitepaper.md`
- `docs/designs/2026-04-10-bleeding-edge-migration-plan.md` (historical)
- official platform references for HealthKit, Health Connect, SMART on FHIR, WHOOP, and Oura

## What This Is

The runtime and storage migration is done.

That means the next job is not more architecture cleanup for its own sake.
It is to turn the now-clean local-first system into a product that is operationally serious, clinically safer, and more useful than the disconnected wellness dashboards it competes with.

This document is the next execution plan.

## Current Baseline

What is true now:

- live runtime is explicit SvelteKit 2 + Svelte 5 + Bun + `@sveltejs/adapter-node`
- server persistence is Bun SQLite / Drizzle-backed mirror storage
- feature routes are direct typed `RequestHandler`s backed by `$lib/server/*/service.ts`
- feature-layer generic DB coupling is gone
- test/runtime separation is explicit through injected in-memory test stores
- the core loop already exists:

```text
Today
  -> Journal / Health / Nutrition / Sobriety / Assessments
  -> Timeline
  -> Review
  -> Plan
  -> back into Today
```

That is a strong base.
The next gains come from product quality and operational excellence, not from another storage rewrite.

## Competitive Gap

The strongest products in adjacent space do a few things well:

- they make daily guidance feel immediate
- they make trends obvious
- they reduce user input friction
- they keep trust high by being consistent and calm

Current gap versus strong competitors and health-adjacent tools:

- Today guidance is useful, but still mostly reactive
- Review is informative, but not yet a true decision engine
- imports are strong technically, but provenance and confidence could be surfaced better
- operational quality is good locally, but release-grade readiness is still under-documented
- there is no explicit evidence framework for “this recommendation was worth following”

## Product Direction

The next phase should make the product feel like a serious personal health operating system, not a collection of good modules.

The rule is simple:

1. keep local-first trust intact
2. make recommendations explainable
3. make the daily loop lower-friction than competitors
4. make weekly review more actionable than competitors
5. operationalize the product so changes can ship without degrading trust

## Phase Sequence

### Phase 1: Today Intelligence

Goal:
Make `/today` the best single-screen daily operating surface in the product.

Why first:
This is where the user feels the product every day.
Improving Today has the highest product leverage.

What to build:

- stronger prioritization of today signals
- explicit recommendation ranking
- “why this is suggested” provenance on every recovery or meal/workout suggestion
- confidence labels for suggestions derived from weak vs strong evidence
- better empty and low-signal states so the screen remains useful even with sparse data
- tighter link-outs from Today into Journal, Health, Nutrition, and Plan when the best action is “capture more context”

Primary touchpoints:

- `src/lib/features/today/**`
- `src/lib/features/review/**`
- `src/lib/features/health/**`
- `src/lib/features/nutrition/**`
- `src/lib/features/planning/**`

Acceptance bar:

- Today always produces one clear primary recommendation when sufficient signal exists
- every recommendation explains inputs and confidence
- no silent stale planned-meal/workout behavior
- regression proof across unit, component, and E2E daily-flow paths

### Phase 2: Review As Decision Engine

Goal:
Turn `/review` from a summary page into a weekly planning engine.

Why second:
The product differentiator is the loop from weekly synthesis into next-week action.

What to build:

- ranked weekly experiments with expected impact and confidence
- explicit “continue / stop / adjust” recommendations for prior experiments
- stronger causal and contextual summaries, not just correlations
- more legible adherence and grocery waste explanations
- device and import provenance surfaced alongside conclusions
- a simple “what changed enough to matter” section

Primary touchpoints:

- `src/lib/features/review/**`
- `src/lib/features/adherence/**`
- `src/lib/features/groceries/**`
- `src/lib/features/imports/**`
- `src/lib/server/review/service.ts`

Acceptance bar:

- weekly review outputs at least one clear next-step recommendation
- recommendation cards cite provenance and confidence
- review snapshots stay deterministic under seeded replay
- no review-refresh regressions in mutation flows

### Phase 3: Provenance And Trust Layer

Goal:
Make imported and derived health data auditable by the user.

Why third:
As more health and fitness data lands, trust becomes a product feature.

What to build:

- explicit provenance display on timeline, review, and today signals
- confidence tiers for manual, imported, inferred, and derived records
- source filters and source badges that are actually useful, not decorative
- import explainability for duplicates, merges, blocked identity matches, and normalization decisions
- “show raw source details” drill-down for imported records

Primary touchpoints:

- `src/lib/features/imports/**`
- `src/lib/features/timeline/**`
- `src/lib/features/review/**`
- `src/lib/features/integrations/**`
- server import/timeline/review services

Acceptance bar:

- a user can tell where a health signal came from in one click
- inferred and derived signals are visually distinct
- identity mismatch paths remain explicit and safe

### Phase 4: Operational Readiness

Goal:
Make the repo and app release-grade.

Why fourth:
The code is now clean enough that operational discipline will compound instead of fighting churn.

What to build:

- stronger CI policy on the now-stable lanes
- explicit release and rollback runbook for local preview and production targets
- artifact-level health checks beyond `/api/status`
- test lane ownership and minimum gating by area
- change budget rules for review-refresh-sensitive flows
- docs for deploy expectations, oncall-style triage, and verification proof

Primary touchpoints:

- `.github/workflows/**`
- `docs/operations-runbook.md`
- `docs/testing-and-verification.md`
- `scripts/check-operational.mjs`
- `docs/maintenance-guide.md`

Acceptance bar:

- CI gating aligns with current architecture, not historical assumptions
- operational docs match real commands and failure modes
- one-command operational proof remains green after every structural tranche

### Phase 5: Platform Expansion Lanes

Goal:
Add higher-value imports only after the loop and trust layer are strong.

Why fifth:
More inputs without better synthesis just creates noise.

Priority order:

1. stronger HealthKit read path / companion polish
2. Android Health Connect parity plan
3. SMART-on-FHIR expansion beyond sandbox

Rules:

- every new source must normalize into the same canonical event graph
- no source gets privileged product logic without provenance
- no platform integration can degrade the local manual loop

Primary touchpoints:

- `apps/ios-companion/**`
- `src/lib/features/imports/**`
- `src/lib/features/integrations/**`
- future Android lane docs, not code-first

Acceptance bar:

- import lanes remain optional
- owner identity and provenance model stays intact
- no platform-specific data path forks the product loop

## Operational Standard

Every future phase should ship with these proofs:

```text
Required
- bun run check
- bun run build
- focused unit lane
- focused component lane
- phase-specific E2E grep lane

For trust-sensitive changes
- deterministic seeded replay proof
- provenance/identity regression proof
- review-refresh regression proof
```

## Not In Scope

These are intentionally not part of the immediate next tranche:

- a rewrite to a different runtime or frontend framework
- broad multi-provider clinical integrations all at once
- turning the app into a social or multi-user product
- generalized analytics infrastructure before Today and Review are stronger
- design-history doc rewrites beyond archival framing

## ASCII Dependency View

```text
Phase 1 Today Intelligence
  depends on current today + nutrition + planning + review seams
  unlocks better daily utility

Phase 2 Review Decision Engine
  depends on Phase 1 recommendations/provenance model
  unlocks better weekly planning

Phase 3 Provenance And Trust Layer
  depends on current imports/timeline/review stack
  unlocks safer platform expansion

Phase 4 Operational Readiness
  can run partly in parallel with 1-3
  unlocks confident shipping

Phase 5 Platform Expansion
  depends on 1-4
  unlocks broader external value without trust collapse
```

## Implementation Rule

Do not start Phase 5 first.

If the product is not already better for a fully manual user, adding another data source is a distraction.

The next best code tranche is Phase 1, Today Intelligence.
