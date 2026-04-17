# SPEC.md

## Slice

Refactor the current Nutrition and Today page shells into smaller, explicit seams without changing behavior.

Primary targets:

- `src/lib/features/nutrition/Page.svelte`
- `src/lib/features/today/components/TodaySignalsSection.svelte`

This is a refactor/maintainability slice.
It is **not** the Phase 2 Review Decision Engine tranche.

## CEO Intake

- Goal: reduce page-shell complexity in Nutrition and Today while preserving current behavior, copy, routing, actions, and deep-link handoff behavior.
- Success criteria:
  - Extract the largest safe orchestration seams from `Nutrition/Page.svelte`.
  - Extract the largest safe presentation seams from `TodaySignalsSection.svelte`.
  - Keep top-level callers and route contracts stable.
  - Preserve current Today and Nutrition UX, notices, and action wiring.
  - Add seam-level verification for newly extracted helpers/components instead of relying only on route-level coverage.
- Constraints:
  - Bun-first workflow only.
  - No lint/test bypasses.
  - No behavior or copy changes unless a regression fix is required.
  - Keep this slice separate from any new Phase 2 Review Decision Engine work.

## Discovery

### Nutrition shell

`src/lib/features/nutrition/Page.svelte` already delegates most visible UI, but it still owns several mixed concerns:

1. Serialized async action execution.
2. Review-strategy deep-link hydration from the URL.
3. Planned-meal draft loading.
4. Recommendation selection and recommendation-to-plan draft mapping.
5. Inline form-field update wrappers.

That makes it a good refactor target because the remaining complexity is page-controller logic, not primary markup.

### Today signals shell

`src/lib/features/today/components/TodaySignalsSection.svelte` was also carrying three distinct presentation concerns in one component:

1. Primary recommendation and fallback rendering.
2. Nutrition pulse rendering.
3. Journal prompt rendering.

That makes it a good companion refactor target because the parent Today page already computes the data shape, so the remaining work is view composition.

### Fresh-eyes review notes against the current codebase

The current workspace already contains both Nutrition and Today refactor changes, so the spec must track both surfaces explicitly.

The original spec had drifted in four important ways:

- it described only the Nutrition refactor even though the workspace also extracts Today signal subcomponents;
- it spoke about changes as already "landed" even though this is still an in-progress local slice;
- it relied too heavily on existing route/component coverage even though new helper seams now deserve direct tests;
- it did not list Today-specific regression risks even though recommendation/fallback/action wiring is part of the active diff.

## Scope boundaries

### In scope

- Extract Nutrition page-controller helpers into focused modules.
- Keep Nutrition route behavior unchanged.
- Extract Today signal presentation into focused child components.
- Keep Today route behavior unchanged.
- Add/require targeted tests for the new seams.

### Out of scope

- Any new Phase 2 Review Decision Engine product work.
- Any new Today recommendation logic.
- Any nutrition recommendation-model rewrite.
- CSS architecture changes beyond what is required to preserve current rendering.
- User-facing behavior or copy changes except for regression fixes.

## Plan

- [x] Extract Nutrition URL-intent hydration into a focused helper module.
- [x] Extract Nutrition planned-meal/recommendation page mutations into a focused helper module.
- [x] Keep `src/lib/features/nutrition/Page.svelte` as the route entrypoint and composition shell.
- [x] Extract `TodaySignalsSection.svelte` into dedicated recommendation, nutrition-pulse, and journal-prompt child components.
- [x] Keep `src/lib/features/today/Page.svelte` and `TodaySignalsSection.svelte` as composition shells with stable props.
- [x] Add direct unit tests for extracted Nutrition helper seams.
- [x] Confirm route/component coverage still proves Today recommendation, fallback, and planned-meal handoff behavior after the split.
- [x] Update this spec so it reflects the actual workspace slice before shipping.

## Current workspace changes

Created:

- `src/lib/features/nutrition/page-actions.ts`
- `src/lib/features/nutrition/page-intent.ts`
- `src/lib/features/today/components/TodayRecommendationSection.svelte`
- `src/lib/features/today/components/TodayRecommendationActionControl.svelte`
- `src/lib/features/today/components/TodayNutritionPulseSection.svelte`
- `src/lib/features/today/components/TodayJournalPromptSection.svelte`

Updated:

- `src/lib/features/nutrition/Page.svelte`
- `src/lib/features/nutrition/actions.ts`
- `src/lib/features/nutrition/components/NutritionComposerSection.svelte`
- `src/lib/features/nutrition/components/NutritionCollectionsSection.svelte`
- `src/lib/features/nutrition/contracts.ts`
- `src/lib/features/nutrition/lookup.ts`
- `src/lib/features/nutrition/model.ts`
- `src/lib/features/nutrition/recommend.ts`
- `src/lib/features/nutrition/planned-meal-resolution.ts`
- `src/lib/features/nutrition/state.ts`
- `src/lib/features/planning/model.ts`
- `src/lib/features/today/actions.ts`
- `src/lib/features/today/components/TodaySignalsSection.svelte`
- `src/lib/features/today/components/TodayNutritionPulseSection.svelte`
- `src/lib/features/today/presentation.ts`
- `src/lib/features/today/recommendation-builders.ts`
- `src/lib/features/today/provenance.ts`
- `src/lib/features/today/snapshot.ts`
- `src/lib/features/today/snapshot-builder.ts`
- `src/lib/server/nutrition/meal-mutations.ts`
- `src/lib/server/nutrition/page-loader.ts`
- `src/lib/server/nutrition/search-service.ts`
- `src/lib/server/nutrition/service.ts`
- `src/lib/server/nutrition/catalog-store.ts`
- `src/lib/server/today/page-actions.ts`
- `src/lib/server/today/page-loader.ts`

Added or expanded tests:

- `tests/features/unit/nutrition/model.test.ts`
- `tests/features/unit/nutrition/page-actions.test.ts`
- `tests/features/unit/nutrition/page-intent.test.ts`
- `tests/features/unit/nutrition/planned-meal-resolution.test.ts`
- `tests/features/unit/nutrition/recommend.test.ts`
- `tests/features/unit/nutrition/server.meal-mutations.test.ts`
- `tests/features/unit/nutrition/search-service.test.ts`
- `tests/features/unit/today/controller.test.ts`
- `tests/features/unit/today/model.test.ts`
- `tests/features/unit/today/intelligence.test.ts`
- `tests/features/unit/planning/model.test.ts`
- `tests/features/component/nutrition/NutritionPage.spec.ts`
- `tests/features/component/planning/PlanPage.spec.ts`
- `tests/features/component/today/TodayPage.spec.ts`
- `tests/features/component/today/TodayNutritionPulseSection.spec.ts`
- `tests/features/component/today/TodaySignalsSection.spec.ts`
- `tests/features/component/today/TodayRecommendationSection.spec.ts`
- `tests/features/component/today/TodayRecommendationActionControl.spec.ts`
- `tests/features/component/today/TodayNutritionPulseSection.spec.ts`
- `tests/features/component/today/TodayJournalPromptSection.spec.ts`
- `tests/features/e2e/daily-core.e2e.ts`
- `tests/features/e2e/plan-to-today.e2e.ts`
- `tests/features/e2e/today-handoffs.e2e.ts`
- `tests/features/e2e/weekly-plan-loop.e2e.ts`

## Current verification evidence

These checks are green against the current workspace state:

- `bun run check:ci`
- `node ./scripts/run-vitest.mjs --config vitest.unit.config.ts tests/features/unit/nutrition/action-route.test.ts tests/features/unit/nutrition/model.test.ts tests/features/unit/nutrition/page-actions.test.ts tests/features/unit/nutrition/page-intent.test.ts tests/features/unit/nutrition/page-state-actions.test.ts tests/features/unit/nutrition/planned-meal-resolution.test.ts tests/features/unit/nutrition/search-service.test.ts tests/features/unit/nutrition/server.meal-mutations.test.ts tests/features/unit/nutrition/themealdb.test.ts tests/features/unit/today/controller.test.ts tests/features/unit/today/model.test.ts tests/features/unit/today/route.test.ts tests/features/unit/today/snapshot.test.ts`
- `node ./scripts/run-vitest.mjs --config vitest.component.config.ts tests/features/component/nutrition/NutritionPage.spec.ts tests/features/component/today/TodayPage.spec.ts tests/features/component/today/TodaySignalsSection.spec.ts tests/features/component/today/TodayRecommendationSection.spec.ts tests/features/component/today/TodayRecommendationActionControl.spec.ts tests/features/component/today/TodayNutritionPulseSection.spec.ts tests/features/component/today/TodayJournalPromptSection.spec.ts`
- `bun run test:e2e -- tests/features/e2e/*.e2e.ts`
- `bun run build`

## Remaining gaps before this slice is truly done

1. Keep the slice narrative honest: this is a shell-refactor tranche, not Phase 2 feature delivery.
2. If new code is added beyond the current shell/helper boundaries, extend verification to the new seam instead of relying on this proof set alone.
3. Keep the stale planned-food replacement path covered in production-mode E2E, since that regression only shows up on the server route path.
4. Keep recipe handoff guidance truthful when nutrition totals are unknown; this path is easy to regress if `undefined` starts behaving like `0` again in Today presentation helpers or Nutrition draft-loading helpers.
5. Keep unknown-macro custom foods truthful when they round-trip back through Nutrition search, recommendation planning drafts, and local-match hydration; saved catalog items must not silently come back as `0 kcal` / `0g protein` after a search or reuse flow.
6. Keep Nutrition recommendation copy and scoring truthful when a saved food has unknown macros; recommendation reasons must not praise zero-valued phantom nutrition or claim steady-energy support without real metric evidence.
7. Keep Today nutrition pulse, guidance, recommendation provenance, and nutrition-support recommendations truthful when logged meals have unknown macros; same-day totals must not fall back to `0` or trigger low-intake advice without evidence.
8. Keep partial-known Today nutrition states precise metric-by-metric; if protein is known but fiber is unknown, Today must not collapse both into one generic unknown or hide the actionable known signal.
9. Keep fresh Nutrition drafts truthful too; blank macro inputs on a new draft must not silently save as `0` when a user records or catalogs a name-only meal.
10. Keep Nutrition day-summary copy truthful when any logged meal has unknown macros; the daily summary must not collapse partial unknown intake into fake `0` totals.
11. Keep saved-food plan-slot summaries truthful across Plan → Today handoffs; unknown-macro saved foods should surface `Nutrition totals unknown` instead of silently dropping nutrition context or implying zero.
12. Keep Today recovery meal swaps evidence-based; unknown-macro saved foods should not be promoted as recovery swap targets when their nutrition totals are still unknown.

## Risks

### Nutrition risks

- Review-strategy deep-link hydration could stop clearing the query string.
- Missing food or recipe IDs could surface the wrong notice or no notice.
- Planned-meal load behavior could drift from current draft-copy semantics.
- Recommendation food vs recipe paths could drift apart.
- A stale selected food match could leak into later manual edits or recipe loads, causing plan/save flows to reuse the wrong catalog identity.
- Hidden recipe notes could leak into later food-match saves or plans because the notes draft state is not visibly editable in the composer.
- An earlier stale planned-food slot could mask a later valid meal slot, breaking Today/Nutrition handoffs even when a real planned meal still exists.
- Planned recipe slots from Plan could be ignored by Today/Nutrition handoff surfaces, leaving valid planned meals invisible until the user manually digs through Plan.
- Recovery meal swaps could preserve stale notes from the replaced planned meal, creating misleading Today handoffs after the slot title/item changes.
- Client/server nutrition draft contracts could silently drop optional provenance like `sourceName`, creating parity drift between local and routed save flows.
- Loading a recipe into the composer could fail to carry its meal type forward, or could leak stale food macros into the recipe draft, drifting the composer path from direct recommendation planning.
- Recipe recommendations or recipe-loaded drafts could lose recipe identity when planned from Nutrition, cloning a fake local food instead of preserving the recipe slot and its grocery derivation.
- Recipe handoffs with unknown nutrition totals could render bogus `0` calorie/protein/fiber/carbs/fat values, fake planned-meal projections, fake composer draft metrics, or fake custom-food catalog macros when recipe-loaded drafts pass through Nutrition save flows.
- Unknown-macro custom foods saved from recipe drafts could round-trip back through local Nutrition search as fake zero-macro matches, causing the meal composer and recommendation plan drafts to silently replace unknown totals with `0`.
- Unknown-macro saved foods could still leak fake certainty through Nutrition recommendations if scoring and visible reasons treat missing metrics like zero and claim baseline or steady-energy fitness without evidence.
- Fresh Nutrition drafts could fabricate zero-macro custom foods if untouched inputs still default to `'0'` before a name-only save.
- Logged meals with unknown macros could still make the Nutrition day summary claim `Calories: 0` or `Protein: 0`, even though total intake is actually unknown rather than zero.
- Remote recipe lookup failures could bubble a 500 through `/api/nutrition/search-recipes` instead of falling back to the local recipe cache.
- Remote Open Food Facts search or barcode lookup failures could bubble a 500 through Nutrition search flows instead of falling back to cached local results or a null barcode miss.
- Client/server nutrition draft types could drift if page-helper changes stop matching route/server mutation contracts.
- Stale planned-food slot cleanup could drift between the client mutation path and the server mutation path, especially when multiple stale same-day slots must be deleted before re-planning.
- Async serialization could accidentally change action ordering if helpers reintroduce nested queue behavior.

### Today risks

- Recommendation primary/secondary/supporting actions could stop routing correctly after component extraction.
- Hash-target CTA behavior could drift if shared action rendering falls back to hardcoded scroll targets.
- Fallback states could drift from the current low-signal UX.
- Recovery meal swaps could target the first planned slot instead of the visible planned meal when stale earlier slots still exist.
- Recovery workout swaps could target the first planned workout instead of the visible planned workout when stale earlier slots still exist.
- Marking a visible planned meal or workout done could leave stale sibling handoffs behind, surfacing false unavailable states on the next reload.
- Same-day event streams could sort by event type instead of real event time, hiding the actual sequence between imported and manual signals.
- Planned recipe meals with unknown nutrition totals could regress back into misleading Today guidance if presentation helpers collapse unknown protein/fiber into fallback meal advice or fabricated intake-gain copy.
- Logged same-day meals with unknown macros could regress back into misleading Today pulse cards, guidance, provenance, or nutrition-support recommendations if snapshot totals or recommendation inputs collapse missing metrics into `0`.
- Partially logged same-day meals could still blur known and unknown nutrition signals together, causing Today guidance/support copy to overstate uncertainty for known metrics or overstate certainty for unknown ones.
- Stale sibling recipe meal slots could survive Today/Nutrition clear flows even after the visible planned meal is cleared.
- Nutrition pulse and journal prompt empty states could regress silently because the split is presentation-only.
- Style drift across the extracted Today child components could change the current section rendering if not covered by component tests.
- Saved-food plan-slot summaries could hide unknown nutrition state during Plan and Today handoffs, leaving name-only custom foods looking like fully described saved-food plans without any explicit unknown-macro warning.
- Recovery adaptation could promote an unknown-macro saved food as a recovery meal swap, creating a high-confidence action without enough nutrition evidence to justify it.

## Verification

Required targeted proof for this slice:

- `bun run check:ci`
- `node ./scripts/run-vitest.mjs --config vitest.unit.config.ts tests/features/unit/nutrition/action-route.test.ts tests/features/unit/nutrition/model.test.ts tests/features/unit/nutrition/page-actions.test.ts tests/features/unit/nutrition/page-intent.test.ts tests/features/unit/nutrition/page-state-actions.test.ts tests/features/unit/nutrition/planned-meal-resolution.test.ts tests/features/unit/nutrition/search-service.test.ts tests/features/unit/nutrition/server.meal-mutations.test.ts tests/features/unit/nutrition/themealdb.test.ts tests/features/unit/today/controller.test.ts tests/features/unit/today/model.test.ts tests/features/unit/today/route.test.ts tests/features/unit/today/snapshot.test.ts`
- `node ./scripts/run-vitest.mjs --config vitest.component.config.ts tests/features/component/nutrition/NutritionPage.spec.ts tests/features/component/today/TodayPage.spec.ts tests/features/component/today/TodaySignalsSection.spec.ts tests/features/component/today/TodayRecommendationSection.spec.ts tests/features/component/today/TodayRecommendationActionControl.spec.ts tests/features/component/today/TodayNutritionPulseSection.spec.ts tests/features/component/today/TodayJournalPromptSection.spec.ts`
- `bun run test:e2e -- tests/features/e2e/*.e2e.ts`

Broaden only if later edits introduce new behavior or widen the touched code path beyond the current shell/helper boundaries:

- rerun the focused E2E lanes that cover the changed flow, or the full `tests/features/e2e/*.e2e.ts` suite if a route-path regression is suspected
- add seam-specific unit/component tests for any newly extracted helpers or child components

## Documentation

- Keep this `SPEC.md` aligned to the real workspace slice.
- Do not describe refactor work as already shipped until the slice is verified and committed.
- No user-facing docs are expected unless behavior changes.
