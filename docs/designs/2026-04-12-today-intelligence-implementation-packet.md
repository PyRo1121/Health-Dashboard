# Today Intelligence Implementation Packet

Status: Active
Date: 2026-04-12
Parent:

- `docs/designs/2026-04-12-world-class-forward-plan.md`
- `ARCHITECTURE.md`
- `docs/feature-flows.md`
- `docs/testing-and-verification.md`

## Purpose

This packet turns Phase 1, Today Intelligence, into an implementation-ready plan.

The goal is not vague “better recommendations.”
The goal is to make `/today` feel like the strongest daily operating surface in the product:

- one clear primary recommendation
- visible confidence and provenance
- lower-friction next actions
- no stale or confusing suggestion behavior

## Product Goal

When the user opens `/today`, the app should answer three questions fast:

1. What matters most right now?
2. Why is that the best next move?
3. What single action should I take next?

## Scope

In scope:

- recommendation ranking on `/today`
- explainability and provenance for Today guidance
- confidence labeling for meal/workout/recovery recommendations
- stronger empty-state and low-signal handling
- explicit capture links into Journal, Health, Nutrition, and Plan
- deterministic tests for recommendation ordering and confidence/provenance output

Not in scope:

- new platform integrations
- cloud sync
- LLM chat coach
- major visual redesign
- review engine rewrite
- clinical records expansion

## Existing Assets To Reuse

Do not rebuild what already exists.

Use these:

- [today snapshot](/home/pyro1121/Documents/Health/src/lib/features/today/snapshot.ts)
- [today actions](/home/pyro1121/Documents/Health/src/lib/features/today/actions.ts)
- [today controller](/home/pyro1121/Documents/Health/src/lib/features/today/controller.ts)
- [review analytics](/home/pyro1121/Documents/Health/src/lib/features/review/service.ts)
- [nutrition summary + planned meal resolution](/home/pyro1121/Documents/Health/src/lib/features/nutrition/summary.ts), [planned-meal-resolution](/home/pyro1121/Documents/Health/src/lib/features/nutrition/planned-meal-resolution.ts)
- [planning snapshot + slot model](/home/pyro1121/Documents/Health/src/lib/features/planning/service.ts), [planning model](/home/pyro1121/Documents/Health/src/lib/features/planning/model.ts)
- [health metrics/provenance helpers](/home/pyro1121/Documents/Health/src/lib/core/domain/health-metrics.ts), [health-events](/home/pyro1121/Documents/Health/src/lib/core/shared/health-events.ts)

## Architecture

### Core idea

Split Today Intelligence into four layers:

```text
TodaySnapshot input graph
  -> signal extraction
  -> recommendation candidates
  -> ranking + confidence
  -> rendered Today sections and action links
```

### Proposed module shape

Additive and local to Today where possible:

```text
src/lib/features/today/
  snapshot.ts                 existing read-model assembly
  intelligence.ts            candidate generation + ranking + confidence
  model.ts                   today UI rows and recommendation presenters
  controller.ts              page orchestration only
  components/
    TodayPrimaryRecommendationCard.svelte
    TodaySignalsSection.svelte
    TodayPlanSurface.svelte
```

Minimal extra helper if needed:

- `src/lib/features/review/attribution.ts`
  only if shared attribution windows become useful in Review later

## Recommendation Model

### Candidate classes

Today should generate recommendation candidates, not directly render ad hoc logic.

Each candidate should carry:

- `id`
- `kind`
- `priority`
- `confidence`
- `reasons[]`
- `provenance[]`
- `action`
- `fallbacks[]`

Suggested kinds:

- `capture_context`
- `log_planned_meal`
- `swap_recovery_meal`
- `swap_recovery_workout`
- `mark_plan_item_done`
- `clear_stale_plan`
- `journal_reflection`
- `health_check_in`

### Confidence model

Keep it simple first.

```text
HIGH
  direct planned item + direct same-day signals + no stale dependencies

MEDIUM
  inferred from 1-2 consistent signals

LOW
  weak or sparse evidence, fallback suggestion only
```

### Provenance model

Every recommendation should expose at least one provenance row.

Examples:

- `Planned workout from weekly plan`
- `Sleep under 6 hours from daily record`
- `Anxiety episode logged at 09:10`
- `Meal recommendation derived from local food catalog`
- `Imported sleep duration from native companion`

## Ranking policy

Start with explicit ranking, not ML.

Order:

1. Safety / recovery preserving actions
2. Time-sensitive planned actions
3. Stale-plan cleanup
4. Context capture
5. Secondary optimization suggestions

Pseudo-policy:

```text
if recovery signal strong:
  primary = recovery recommendation
else if planned meal/workout exists and is actionable:
  primary = next planned action
else if stale plan exists:
  primary = cleanup recommendation
else if signal is sparse but concerning:
  primary = capture context
else:
  primary = best low-friction momentum action
```

## File Touchpoints

### Primary files

- [snapshot.ts](/home/pyro1121/Documents/Health/src/lib/features/today/snapshot.ts)
  add candidate input extraction and provenance-ready signal output
- [controller.ts](/home/pyro1121/Documents/Health/src/lib/features/today/controller.ts)
  keep orchestration thin, no ranking logic here
- [model.ts](/home/pyro1121/Documents/Health/src/lib/features/today/model.ts)
  shape rows/cards from ranked candidates
- [TodaySignalsSection.svelte](/home/pyro1121/Documents/Health/src/lib/features/today/components/TodaySignalsSection.svelte)
  show provenance/confidence/reasoning
- [TodayPlanSurface.svelte](/home/pyro1121/Documents/Health/src/lib/features/today/components/TodayPlanSurface.svelte)
  surface primary action more clearly

### Supporting files

- [review/service.ts](/home/pyro1121/Documents/Health/src/lib/features/review/service.ts)
  only if attribution/confidence logic is better shared
- [health-events.ts](/home/pyro1121/Documents/Health/src/lib/core/shared/health-events.ts)
  only if current display helpers need provenance expansions

## Dependency Table

| Step                                      | Modules touched                                                   | Depends on         |
| ----------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| Define candidate + confidence types       | `today/intelligence.ts`, `today/model.ts`                         | —                  |
| Produce candidate inputs from snapshot    | `today/snapshot.ts`                                               | candidate types    |
| Render primary recommendation surface     | `today/components/*`, `today/Page.svelte`                         | candidate output   |
| Add recommendation-driven tests           | `tests/features/unit/today/*`, `tests/features/component/today/*` | candidate output   |
| Add E2E proof for daily priority behavior | `tests/features/e2e/daily-flows.e2e.ts`                           | UI behavior stable |

## Parallelization Plan

Lane A: recommendation engine types + ranking logic

- `today/intelligence.ts` → `today/model.ts`

Lane B: snapshot signal extraction

- `today/snapshot.ts`

Lane C: UI surface

- `today/components/*` + `today/Page.svelte`

Lane D: verification

- unit/component/E2E test additions

Execution order:

- A + B in parallel
- C after A/B contracts stabilize
- D in parallel with C once candidate shape is settled

Conflict flags:

- `today/model.ts` and `today/Page.svelte` are likely shared by A and C, so keep ownership explicit if parallelized
- `today/snapshot.ts` should stay owned by one lane only

## Tests

### Unit

Add or extend:

- [today snapshot](/home/pyro1121/Documents/Health/tests/features/unit/today/snapshot.test.ts)
  new cases for candidate ordering, confidence, provenance, and empty-state fallback
- [today controller](/home/pyro1121/Documents/Health/tests/features/unit/today/controller.test.ts)
  new cases for action text/notice stability under ranked recommendations
- [review service](/home/pyro1121/Documents/Health/tests/features/unit/review/service.test.ts)
  only if shared attribution logic is introduced

### Component

Extend:

- [TodayPage.spec.ts](/home/pyro1121/Documents/Health/tests/features/component/today/TodayPage.spec.ts)
  assert one visible primary recommendation, reasoning text, provenance labels, and correct fallback actions

### E2E

Extend:

- [daily-flows.e2e.ts](/home/pyro1121/Documents/Health/tests/features/e2e/daily-flows.e2e.ts)

New checks:

- recovery recommendation outranks generic plan action when sleep + symptom/anxiety signals are strong
- planned meal remains primary when signals are calm and the plan is healthy
- stale plan produces a cleanup recommendation rather than silent disappearance
- sparse-day state still gives one useful next action

### Required proof commands

```sh
bun run check
bun run build
node ./scripts/run-vitest.mjs --config vitest.unit.config.ts tests/features/unit/today/controller.test.ts tests/features/unit/today/snapshot.test.ts tests/features/unit/review/service.test.ts
node ./scripts/run-vitest.mjs --config vitest.component.config.ts tests/features/component/today/TodayPage.spec.ts
bun run test:e2e --grep "today daily check-in flow|today recovery actions swap in the fallback suggestions"
```

## Failure Modes

### 1. Fake precision

Failure:

- Today shows a high-confidence recommendation from weak evidence

Guard:

- explicit confidence thresholds
- tests for low-signal fallback behavior

### 2. Stale plan invisibility

Failure:

- planned meal/workout disappears with no clear user guidance

Guard:

- stale-plan recommendation with provenance and next action
- existing stale plan tests extended

### 3. Recommendation thrash

Failure:

- primary recommendation changes too easily from small signal noise

Guard:

- deterministic ranking and tie-break rules
- seeded replay tests

### 4. Review refresh regression

Failure:

- Today action changes stop updating weekly review implications

Guard:

- retain current review-refresh mutation proofs
- run today/review regression lane on every Today Intelligence change

## Rollout Standard

Phase 1 is complete only when:

- Today has one clear primary recommendation in the main supported cases
- recommendation cards expose reason + provenance + confidence
- empty/low-signal states remain useful
- no current daily-flow regressions
- recommendation ordering is deterministic under seeded replay

## Not In Scope

Explicitly not in this packet:

- causal scoring engine in Review
- new import connectors
- cloud sync
- multi-user support
- new clinical ingest lanes
- operational CI/release redesign

## Final Rule

Keep this phase product-first.

If a change does not improve what the user sees and decides on `/today`, it probably belongs in a later phase.
