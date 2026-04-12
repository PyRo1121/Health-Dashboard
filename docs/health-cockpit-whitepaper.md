# Personal Health Cockpit White Paper

Status: Active  
Date: 2026-04-10

## Executive Summary

Personal Health Cockpit is a private, local-first health operating system for a single user.

It is not a hospital portal.

It is not a generic wellness dashboard.

It is not a SaaS analytics product with health branding.

The product thesis is simpler and stronger:

- capture what is true today
- preserve narrative and clinical context
- normalize everything into one trusted local timeline
- generate a calm weekly review that helps the user make better decisions

The core product loop is:

```text
Today
  -> Journal / Health / Nutrition / Sobriety / Assessments
  -> Timeline
  -> Review
  -> Plan
  -> back into Today
```

This white paper is the implementation-facing and product-facing source of truth for why this app exists, how it should evolve, and which future expansions actually fit the system.

## Problem Statement

Most personal health products solve one slice only:

- nutrition
- workouts
- journaling
- sobriety
- mood
- clinical record access

That is not enough.

Real life is cross-domain:

- bad sleep affects mood
- mood affects food choices
- food choices affect energy
- stress affects cravings
- cravings affect sobriety risk
- symptoms affect planning
- imported wearable or clinical data only matters if it changes real decisions

The user does not need another disconnected app.

The user needs one private system that can answer:

- what is true today?
- what changed this week?
- what patterns are emerging?
- what should I try next?

## Product Thesis

The moat is not “more integrations.”

The moat is a trusted local loop:

1. **Capture**
   - daily check-in
   - fast logging
   - narrative context
   - structured assessments

2. **Normalize**
   - manual events
   - imported device data
   - imported journal data
   - future clinical data

3. **Review**
   - weekly synthesis
   - adherence signals
   - context signals
   - practical experiments

4. **Execute**
   - planning
   - groceries
   - Today recovery actions
   - next-week follow-through

If this loop works, the product is useful even with limited integrations.

If this loop does not work, more integrations only create prettier noise.

## Trust Model

The trust model is local-first.

This matters more in health software than in almost any other consumer category.

Health data is unusually sensitive:

- symptom notes
- cravings
- relapse context
- journal reflections
- assessments
- imported clinical records

The system should therefore follow these rules:

- canonical user truth lives locally
- external APIs are enrichment or intake paths, not the primary source of truth
- imports are staged before commit
- derived analytics are computed locally from local records
- failure of remote systems must degrade gracefully, not invalidate core workflows

This aligns with the design direction already established in [DESIGN.md](../DESIGN.md) and the local-first architecture documented in [ARCHITECTURE.md](../ARCHITECTURE.md).

## Why This Architecture Fits 2026

### 1. Apple HealthKit and clinical records fit import and companion lanes, not the whole product

Apple’s current HealthKit documentation makes two things clear:

- HealthKit is a standardized repository for health and fitness data
- clinical records are accessible as discrete FHIR-based records, not as a complete product layer

That supports this product direction:

- import and normalize HealthKit data
- optionally read clinical records through HealthKit-supported flows
- keep the interpretation and weekly review layer in our own app

Relevant references:
- Apple HealthKit overview: https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework
- Apple Health Records: https://developer.apple.com/documentation/healthkit/accessing-health-records
- Apple HealthKit setup: https://developer.apple.com/documentation/healthkit/setting-up-healthkit

### 2. Android Health Connect supports the same general direction

Android’s Health Connect direction reinforces the same architectural bet:

- centralized, user-controlled health aggregation
- structured records and permissions
- health data interop without every app owning the full system

That means future Android support should follow the same model as iOS:

- import or synchronize structured records
- normalize them into the same local event graph
- keep product value in synthesis, review, and execution

Relevant reference:
- Android Health Connect overview: https://developer.android.com/health-and-fitness/guides/health-connect/overview

### 3. SMART on FHIR is the right standards lane for future clinical import

SMART on FHIR best practices still reinforce:

- auth rigor
- TLS
- short-lived access
- explicit scopes
- careful refresh token handling

That means clinical integrations are possible, but they must be treated as high-trust and high-complexity lanes.

For this product, the right near-term posture is:

- support SMART sandbox and narrow import paths
- normalize imported clinical records into local events
- keep provider/EHR access as additive, not foundational

Relevant reference:
- SMART on FHIR auth best practices: https://docs.smarthealthit.org/authorization/best-practices

### 4. USDA FoodData Central remains the right nutrition enrichment baseline

FoodData Central still provides the strongest public nutrition enrichment foundation for this app:

- search
- food details
- widely understood nutrient structure
- clear API-key expectations

That supports the current nutrition architecture:

- local food logging first
- USDA lookup and enrichment when available
- fallback/local behavior when unavailable

Relevant reference:
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide

### 5. Current Svelte/SvelteKit guidance supports explicit ownership and typed feature slices

The current Svelte and SvelteKit docs strongly support:

- explicit project structure
- typed Svelte components
- regression-backed testing with Vitest and Playwright
- avoiding legacy syntax drift
- using Svelte 5 idioms intentionally rather than mixing generations

That matches the code cleanup direction already underway:

- direct imports from owner modules
- local helpers for repeated orchestration
- no speculative generic controller framework
- test-backed structural changes

Relevant references:
- SvelteKit project structure
- Svelte best practices
- Svelte testing
- Svelte TypeScript

## Current Product Architecture

The current live structure is documented in:

- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [docs/api-reference.md](api-reference.md)
- [docs/data-model.md](data-model.md)
- [docs/feature-flows.md](feature-flows.md)

In short:

```text
Page.svelte
  -> client.ts
  -> /api route
  -> state.ts / actions.ts / controller.ts / snapshot.ts / service.ts
  -> local DB
  -> optional weekly review refresh
```

This is a good architecture for the product because:

- it keeps features vertically sliced
- it keeps local-first behavior explicit
- it makes testing realistic without over-complication
- it preserves room for imports and future companion/clinical lanes

## Current Product Surface

The current feature map is:

- Today
- Plan
- Movement
- Groceries
- Journal
- Health
- Nutrition
- Sobriety
- Assessments
- Timeline
- Review
- Imports
- Integrations
- Settings

That is already enough surface area to build a serious personal operating system.

The right question is not “what else can we add?”

The right question is “which additions deepen the loop instead of distracting from it?”

## Canonical Product Principles

### 1. Timeline-first, not widget-first

The timeline is the proof surface.

If imported or manual data is not visible there, it is not trustworthy.

### 2. Review is core, not polish

Review is the point where the system becomes meaningfully better than a set of disconnected trackers.

### 3. Narrative matters

Journal context is not an optional note field.

Narrative is part of the causal graph.

### 4. Planning must feed execution

Planning is only valuable if it actually changes Today.

### 5. Local-first trust beats cloud-first cleverness

If the user cannot understand where their data lives and what the app is doing with it, trust is gone.

## Future Expansion Lanes That Fit The Product

These are the most coherent future directions.

### Lane A: Better clinical import, not full portal replication

Good:
- expand SMART sandbox path
- add more normalized clinical resource mappings
- improve provider-import provenance
- add review-aware clinical context summaries

Bad:
- trying to become a full provider portal
- duplicating scheduling, billing, or hospital workflow systems

### Lane B: Better native companion and device import

Good:
- strengthen iPhone companion flows
- add Android companion / Health Connect import paths
- improve background sync and trustable device summaries
- enrich timeline and weekly review with better device context

Bad:
- trying to be a generalized wearable cloud

### Lane C: Better planning and execution

Good:
- recovery-aware planning
- meal plan to grocery to Today execution
- workout template to Today execution
- better adherence matching

Bad:
- complex planner abstractions that do not improve execution quality

### Lane D: Better interpretation layer

Good:
- stronger weekly review signals
- explainable trend detection
- experiment tracking
- clearer “what changed and why” summaries

Bad:
- black-box pseudo-AI health scoring
- opaque recommendation systems with no traceability

### Lane E: Better user trust and maintenance

Good:
- operational verification
- docs that match the code
- privacy and provenance clarity
- regression-heavy cleanup

Bad:
- clever architecture nobody can maintain

## Future Expansion Lanes That Do Not Fit

These are tempting, but wrong for now:

- social features
- provider-portal clone behavior
- broad telehealth workflow integration
- generic “AI coach” layer before the review loop is truly great
- multi-user collaboration
- cloud sync before local-first trust and review quality are genuinely strong

## What Makes This World-Class

A world-class health app in this category is not the one with the most integrations.

It is the one that is:

- trustworthy
- calm
- explicit
- local-first
- traceable
- good at synthesis
- good at next-step execution

That means the quality bar is:

```text
capture truth
  -> preserve context
  -> normalize safely
  -> review clearly
  -> plan concretely
  -> execute the next day
```

If a future feature improves that loop, it belongs.

If it does not, it is probably noise.

## Engineering Program Implications

This product should evolve through these engineering priorities:

1. protect local-first trust
2. keep feature ownership explicit
3. keep review-refresh dependencies correct
4. keep docs matched to code
5. prefer small, verified cleanup slices over architecture theater

That is why the current cleanup program is correct:

- remove low-value indirection
- reduce local orchestration duplication
- document the real system
- keep all of it green under tests and `bun run check`

## Recommended Long-Term Source Of Truth Stack

For AI agents and humans, the source-of-truth reading order should be:

1. [DESIGN.md](../DESIGN.md)
2. [ARCHITECTURE.md](../ARCHITECTURE.md)
3. [docs/developer-guide.md](developer-guide.md)
4. [docs/api-reference.md](api-reference.md)
5. [docs/data-model.md](data-model.md)
6. [docs/feature-flows.md](feature-flows.md)
7. [docs/privacy-and-local-first.md](privacy-and-local-first.md)
8. [docs/operations-runbook.md](operations-runbook.md)
9. [docs/testing-and-verification.md](testing-and-verification.md)
10. [docs/maintenance-guide.md](maintenance-guide.md)
11. planning / tranche / implementation packets

This order gives:
- product intent
- live architecture
- coding rules
- route surface
- data surface
- user flows
- trust model
- runbook
- test discipline
- maintenance discipline

That is enough context for a serious AI or human contributor to make good decisions without guessing.

## References

- Apple HealthKit overview: https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework
- Apple Health Records: https://developer.apple.com/documentation/healthkit/accessing-health-records
- Apple HealthKit setup: https://developer.apple.com/documentation/healthkit/setting-up-healthkit
- SMART on FHIR authorization best practices: https://docs.smarthealthit.org/authorization/best-practices
- USDA FoodData Central API guide: https://fdc.nal.usda.gov/api-guide
