# Personal Health Cockpit Visual Spec

Status: Active
Date: 2026-04-02
Parent docs:
- `DESIGN.md`
- `docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md`
- `docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md`

## What This Doc Does

This is the bridge between abstract design rules and implementation.

The other docs explain what the product is and how it ships.

This doc explains what the important screens should feel like and what visual patterns are allowed.

## Generated Design Explorations

These artifact sets were generated for design review on 2026-04-02:

- Today:
  - board: `/home/pyro1121/.gstack/projects/Health/designs/today-20260402/design-board.html`
  - variants:
    - `/home/pyro1121/.gstack/projects/Health/designs/today-20260402/variant-A.png`
    - `/home/pyro1121/.gstack/projects/Health/designs/today-20260402/variant-B.png`
    - `/home/pyro1121/.gstack/projects/Health/designs/today-20260402/variant-C.png`
- Journal:
  - board: `/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/design-board.html`
  - variants:
    - `/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/variant-A.png`
    - `/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/variant-B.png`
    - `/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/variant-C.png`
- Review:
  - board: `/home/pyro1121/.gstack/projects/Health/designs/review-20260402/design-board.html`
  - variants:
    - `/home/pyro1121/.gstack/projects/Health/designs/review-20260402/variant-A.png`
    - `/home/pyro1121/.gstack/projects/Health/designs/review-20260402/variant-B.png`
    - `/home/pyro1121/.gstack/projects/Health/designs/review-20260402/variant-C.png`

## Approved Mockups

| Screen | Approved variant | Path | Why |
|---|---|---|---|
| Today | B | `/home/pyro1121/.gstack/projects/Health/designs/today-20260402/variant-B.png` | strongest hierarchy, calmest operational tone, least card-soup risk |
| Journal | A | `/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/variant-A.png` | best writing-room feel, strongest editorial restraint, cleanest journaling affordance |
| Review | B | `/home/pyro1121/.gstack/projects/Health/designs/review-20260402/variant-B.png` | best briefing hierarchy, clearest narrative flow, strongest 2026 premium app feel |

These are now the canonical visual references unless a later design pass explicitly supersedes them.

## Screen Blueprints

## Today

### Layout intent

The Today screen should feel operational, not analytical.

It should read top-to-bottom in one strong column, with optional secondary context on desktop.

### Required blocks

1. day framing
2. quick check-in
3. sobriety and craving
4. food shortcuts
5. journal prompt or latest reflection
6. event timeline for the day

### What to avoid

- six equal cards in a grid
- giant chart first
- generic KPI tiles
- decorative wellness illustrations

## Journal

### Layout intent

The Journal screen should feel like a writing room.

It needs more breathing room than the rest of the app.

### Required blocks

1. entry creation action
2. active writing surface
3. entry metadata and tags
4. linked same-day context
5. recent entries / timeline

### What to avoid

- tiny text area in a card
- note-app chrome everywhere
- heavy toolbar clutter

## Weekly Review

### Layout intent

The Review screen should feel like a weekly briefing memo with supporting evidence.

It should privilege narrative hierarchy over chart density.

### Required blocks

1. weekly headline
2. what changed
3. drift and warnings
4. explainable correlations
5. sobriety and assessment context
6. next-week experiment
7. supporting evidence drilldown

### What to avoid

- BI dashboard walls
- twelve equal panels
- loud accent colors fighting for attention
- charts without interpretation

## Component Vocabulary

These are the only primary component families the app should lean on at first:

- shell navigation
- section header
- quick-toggle chips
- metric input row
- reflective prompt block
- event row
- linked context pill
- severity banner
- weekly insight block
- drilldown chart
- import diff table

### Rules

- if a component cannot be described in one sentence, it is probably too custom
- new components should extend this vocabulary before inventing a new visual family
- cards are allowed only when they are semantically grouping an interaction, not as default decoration

## Chart Grammar

Charts should be restrained and sparse.

### Allowed

- line trends
- small bar comparisons
- dot plots
- annotated streak views

### Required

- one headline takeaway above the chart
- axis and label clarity
- annotation when a shift matters
- drilldown path to raw events
- default line weight `2px`
- warm-neutral background with faint horizontal grid only
- pine for primary trend lines
- brass for annotations and key callouts
- bars in muted sand or warm neutral with a single pine highlight state

### Forbidden

- radial wellness donuts
- 3D charts
- rainbow category overload
- charts without interpretation

## Empty State Copy Model

Each empty state should follow this structure:

1. orientation
2. why this area matters
3. one primary action
4. one reassuring sentence

### Example

Instead of:

- `No journal entries yet`

Use:

- `Nothing written yet today. Start with one sentence about what mattered, then add more if you want.`

## Responsive Rules

## Desktop

- left nav stays visible
- main content column leads
- optional right rail only if it adds clarity

## Mobile

### Recommended nav

Use bottom nav for:

- Today
- Journal
- Review
- More

### Why

These are the highest-frequency surfaces.

Nutrition, sobriety, assessments, imports, and settings can sit under More if needed.

### Mobile behavior

- Today prioritizes capture
- Journal prioritizes writing
- Review prioritizes summary first, drilldown second

## Accessibility-Specific Visual Rules

- focus rings must be obvious against warm neutrals
- status color must always have text or icon reinforcement
- severity banners need headline + body + next action
- assessment progress indicators must not depend on color alone

## Motion and Feedback

### Allow

- subtle save confirmation
- progressive reveal inside weekly review
- measured route transition cues

### Avoid

- bouncing elements
- decorative loops
- playful motion in relapse or safety-sensitive flows

## Current Unresolved Design Decisions

1. exact component primitive package selection
2. final responsive refinements after first implemented screens
3. icon usage density rules once real UI density is visible

## Recommendation

Implementation can now start from the approved visual directions and the T0/T1 packet without waiting on more planning.
