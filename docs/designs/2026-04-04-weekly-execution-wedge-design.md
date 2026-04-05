# Weekly Execution Wedge Design

Status: Draft
Date: 2026-04-04
Branch: `main`
Mode: Startup wedge
Source: `/office-hours` synthesis before `/plan-eng-review`

## Problem Statement

Health-conscious people who try to plan their week still end up stitching together:

- one app for food
- one app for workouts
- one app for groceries
- one app or note flow for symptoms, mood, or mental-health context
- one calendar or notes workflow for actual weekly planning

The current market does many of these jobs well in isolation.

It does not run the whole week well in one calm, coherent loop.

## Demand Evidence

Current stage is pre-product.

There is not yet hard external demand evidence like paying customers or retained weekly users.

What does exist:

- strong founder conviction from personal pain
- clear market frustration around fragmentation and paywalled convenience
- visible category leaders that prove each sub-problem is real

This is not validated demand.

It is a sharp product thesis.

## Status Quo

Closest current user stack:

- nutrition truth: `Cronometer`, `MacroFactor`, `MyFitnessPal`
- workouts: `Hevy`, `Strong`
- groceries / meal planning: `AnyList`, `Paprika`
- symptoms / mental-health context: `Bearable`, `Daylio`, Notes
- weekly planning: Notes, Calendar, or nothing structured

The real competitor is not one app.

It is the stack.

## Target User And Narrowest Wedge

First user:

> a solo health-conscious adult who wants to plan meals, workouts, and groceries for the week without juggling multiple apps

Narrowest wedge:

> weekly food + workout planning with automatic grocery generation

This is the startup wedge because it beats the stack at the weekly behavior layer, not the deepest specialty layer.

## Constraints

- single-user
- local-first
- calm, adult, trustworthy UX
- no cloud sync requirement
- no AI therapist / fake conversational coach
- no social feed
- no grocery delivery integrations in v1
- no “beat Cronometer on micronutrients” requirement in v1

## Premises

1. The real opportunity is weekly execution, not broader health logging.
2. Users will accept weaker depth in one vertical if the weekly system reduces cross-app friction enough.
3. Grocery generation is the highest-leverage convenience layer because it converts planning into action.
4. Recovery-aware daily adaptation should be phase 2, not the initial wedge.
5. Integrated symptom / mood / mental-health journaling should support the loop, not define the wedge.

## Cross-Model Perspective

- CEO review direction: build the week, not more trackers.
- Engineering review direction: one canonical planning domain, local grocery engine, movement and review reading from planning outputs.
- Market research direction: category leaders are strong in silos, weak as a coherent weekly operating system.

## Approaches Considered

### Approach A: Weekly Execution Wedge

Summary:
Build the planner board, grocery derivation, workout slots, and plan-to-Today / plan-to-Review handoffs first.

Effort:
L

Risk:
Medium

Pros:

- strongest differentiation against the current stack
- directly tied to weekly usage, not passive logging
- reuses existing nutrition, review, and today foundations

Cons:

- touches multiple product surfaces at once
- requires crisp canonical planning data model
- UI quality matters a lot more than in a pure tracker feature

Reuses:

- nutrition catalog and recipe flows
- today execution flows
- review adherence framing
- current local-first storage and feature architecture

### Approach B: Recovery-Aware Daily Engine First

Summary:
Make Today intelligent first, rewrite the day based on sleep, symptoms, mood, and energy, then add planning later.

Effort:
M

Risk:
Medium

Pros:

- strong emotional differentiation
- daily value can be obvious fast
- easier to explain as “smart daily guidance”

Cons:

- weaker wedge against grocery / planning competition
- depends on enough user signal to feel intelligent
- risks becoming “one more adaptive tracker”

Reuses:

- health logging
- today page
- review signal layer

### Approach C: Integrated Health Journal First

Summary:
Replace the fragmented symptom / mood / mental-health note stack first, then add planning later.

Effort:
M

Risk:
Low

Pros:

- simpler first launch
- easier message for the founder’s own current pain
- strong journaling + reflection angle

Cons:

- weaker startup wedge
- easier for users to defer or ignore weekly
- less strategically differentiated than the weekly execution loop

Reuses:

- journal
- health events
- assessments
- review context

## Recommended Approach

Choose **Approach A**.

That is the wedge.

Not because it is easier.

Because it is the first version that makes the product actually different.

## Success Criteria

Within one weekly cycle, the user can:

1. place meals and workouts onto a weekly board
2. get an auto-generated grocery list from planned recipes
3. open Today and see the next due planned items
4. complete or skip those items without leaving the loop
5. open Review and see plan-vs-actual adherence

If that works, the product stops being “a promising tracker” and starts being a weekly operating system.

## Information Hierarchy By Wedge Screen

The wedge only works if every major screen has one obvious job.

If the hierarchy is fuzzy, the product turns into calm-looking confusion.

### Plan

```text
1. Weekly board
   - 7-day rhythm
   - meal / workout / note slots
   - current week context

2. Slot composition
   - add meal
   - add workout
   - add note / leftovers / eat-out placeholders

3. Weekly support context
   - grocery preview
   - plan warnings
   - movement template jump points
```

Plan is the iconic surface.

It should feel like shaping the week, not filling in a form.

### Groceries

```text
1. Merged checklist
   - grouped by ingredient / aisle
   - one visible row per grocery concept

2. Provenance context
   - recipe sources
   - manual vs derived chips
   - checked / excluded / missing state

3. Planner relationship
   - week title
   - warnings
   - quick jump back to the plan
```

Groceries is a ledger surface.

It should feel operational, not decorative.

### Movement

```text
1. Workout template library
   - reusable templates
   - goal labels
   - first-scan usefulness

2. Shared workout editor
   - title / goal
   - exercise rows
   - clear save action

3. Exercise search + supporting context
   - search
   - result pickers
   - optional rich details only where useful
```

Movement exists to make planning stronger.

It is not a separate social fitness product.

### Today

```text
1. Next due planned items
   - planned meal
   - planned workout
   - visible plan issues if anything is stale

2. Daily execution
   - check-in
   - log planned meal
   - mark planned workout done / skipped

3. Daily context
   - latest events
   - nutrition pulse
   - recovery-relevant state
```

Today is the execution desk.

It should answer, “what matters right now?”

### Review

```text
1. Weekly briefing
   - headline
   - key patterns
   - what mattered this week

2. Adherence audit
   - plan vs actual
   - why something counted / missed
   - grocery waste / miss signals

3. Next-week decisions
   - repeat / rotate / skip
   - experiment / change decisions
```

Review is the calm briefing.

The adherence audit is subordinate to the briefing, not a separate product surface.

## Mobile Information Architecture

The mobile loop must reflect the product moat.

Primary mobile navigation:

```text
Today | Plan | Review | More
```

Rules:

- `Plan` replaces `Journal` in the primary loop
- `Journal` moves under `More` or into `Today`-adjacent capture flows
- `Review` stays primary because it closes the weekly loop
- `Movement` and `Groceries` are reachable from `Plan` and `More`, not primary mobile destinations

Why:

- the wedge is weekly execution
- mobile primary nav should privilege the execution loop, not legacy supporting surfaces
- too many primary destinations weakens hierarchy and makes the product feel generic

## Desktop Information Architecture

Desktop must make the weekly operating system feel like one workspace, not a folder full of adjacent tools.

Primary weekly workspace:

```text
Plan
  ├── weekly board
  ├── inline workout authoring shell
  └── grocery preview / warnings / jumps
```

Supporting weekly surfaces:

```text
Groceries
  - operational checklist
  - downstream of planning

Movement
  - full workout template editor
  - downstream of planning

Review
  - downstream weekly briefing and adherence audit
```

Rules:

- `Plan` is the hero workspace for the wedge
- `Groceries` and `Movement` may remain separate routes, but they are visually and narratively subordinate to `Plan`
- desktop nav weight, page headers, and visual emphasis must reinforce that `Plan` is the center of the weekly loop
- `Today` remains the daily execution desk, not a competing planning destination

This keeps the product feeling like one weekly operating system with supporting surfaces, not a shelf of equal-weight tools.

## Interaction State Coverage

Every wedge surface must specify what the user sees when the system is loading, empty, partially ready, or wrong.

Generic fallback copy is not acceptable.

| Feature   | Loading                                                              | Empty                                                                                                                         | Error                                                                                                              | Success                                                                                    | Partial / Stale                                                                                                               |
| --------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Plan      | Calm board skeleton with visible 7-day rhythm, not blank white space | Empty board with one primary CTA to add the first meal or workout, plus a sentence explaining that the week is still unshaped | Clear blocking message when the board cannot hydrate, with one retry action and one “return to today” escape hatch | Board shows saved slots, compact support context, and clear next actions                   | Show per-slot warnings for stale or missing recipe/workout references without collapsing the rest of the board                |
| Groceries | Ledger skeleton rows grouped by aisle / ingredient bands             | Intentional empty checklist that says recipes create groceries, plus one jump back to Plan                                    | Clear grocery engine failure state with retry and explanation that planning data still exists                      | Merged checklist rows with provenance chips, check states, and grouped readability         | Show warnings when some rows were skipped, some provenance is missing, or merged state is stale, but keep usable rows visible |
| Movement  | Template library skeleton plus editor shell skeleton                 | Empty template library with one strong CTA to create the first reusable workout                                               | Clear search / save failure state, especially for exercise lookup, with text-first fallback                        | Template library and editor feel stable, useful, and operational                           | Missing exercise media or instructions degrades to text-only rows, never broken cards                                         |
| Today     | Daily briefing skeleton with planned-item placeholders               | Empty state focused on “nothing logged yet today” and the next best capture action                                            | Save/logging failures are visible inline near the relevant action, not lost in a generic banner                    | The day shows clear next due items, completed actions, and visible progress                | If planned items are stale or unresolved, Today explains exactly what is missing and how to fix it in Plan                    |
| Review    | Briefing skeleton first, not dashboard card soup                     | Empty weekly review says you need one real week of intent + execution before the review can be useful                         | Clear retryable failure state that preserves trust and never pretends patterns were found                          | Briefing headline, adherence audit, and next-week choices appear in a clear top-down order | Confidence, inferred adherence, and stale / partial signals must be explicitly labeled so the product never feels fake        |

### State Rules

- loading states keep the surface grammar visible
- empty states always explain what unlocks value next
- error states always include a recovery action
- partial states are normal in this product and must be treated as first-class, not hidden
- stale states must preserve trust through explicit labeling

### Migration Overlap State

During the temporary overlap between legacy `plannedMeals` and canonical `PlanSlot`, the UI must handle that state explicitly.

Rules:

- `PlanSlot` always wins when both systems have data for the same day / context
- legacy `plannedMeals` is presented only as fallback context, never as equal peer state
- the user should never feel like the app is making up conflicting planned intent

Specific UX:

- `Today` shows a small compatibility notice only when legacy fallback data is actually being used
- `Review` may mention that some planned intent came from migrated legacy data, but only in a low-drama support line, never as the headline
- if both legacy and canonical data exist and disagree, canonical wins and the UI must not present both as competing truths
- if migration fails or fallback data is malformed, show a visible explanation and one corrective path instead of silent disappearance

## User Journey And Emotional Arc

This product is not just a weekly utility.

It is a weekly behavior-support system.

That means the emotional arc matters.

| Step | User does                               | User feels                         | Plan must support                                                                 |
| ---- | --------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| 1    | Opens `Plan` on Sunday night            | Hopeful, but slightly overwhelmed  | The weekly board must feel calm, bounded, and shapeable in one sitting            |
| 2    | Places meals and workouts into the week | Increasing clarity                 | Board hierarchy and slot types must reduce cognitive load, not add it             |
| 3    | Checks groceries                        | Relief, the plan became actionable | Grocery generation must feel like a consequence of planning, not a separate chore |
| 4    | Opens `Today` midweek                   | Busy, maybe behind, maybe guilty   | Today must answer “what matters now?” without punishing drift                     |
| 5    | Marks things done, skipped, or stale    | Honest, operational                | Status language and state treatment must feel factual, not moralizing             |
| 6    | Opens `Review` at week end              | Reflective, slightly vulnerable    | Review must feel like a calm briefing, not a report card                          |
| 7    | Chooses what to repeat or change        | Clear, not confused                | Adherence and next-step guidance must feel explainable and trustworthy            |

### Emotional Rules

- `Plan` should create calm and clarity
- `Groceries` should create momentum
- `Today` should reduce shame and ambiguity
- `Review` should create confidence and useful honesty

### Anti-Pattern

Do not let any wedge screen feel like:

- a BI dashboard
- a self-judgment machine
- a productivity guilt trap
- a therapy app pretending to be a planner

## AI Slop Guardrails

The wedge must not default into generic SaaS patterns.

### The planner board must not look like

- a kanban board clone
- a project-management product
- a grid of generic cards
- a dashboard made of repeated panels
- a meal-planner template with random imagery

### Groceries must not look like

- checklist rows trapped inside oversized cards
- decorative list UI with no scan speed
- a second-class side panel that feels optional

### Movement must not look like

- a generic fitness SaaS template
- icon-circle feature boxes
- a social workout app

### Review must not look like

- a KPI dashboard
- a scorecard wall
- a fake coaching interface

### Hard anti-slop rules

- no generic 3-column feature-grid patterns in the wedge surfaces
- no centered-everything “marketing page” layouts inside the product workspace
- no decorative card stack where layout and typography would do
- no stock-photo hero treatment inside operational screens
- no visual hierarchy where every section feels equally loud

### Litmus Tests

If implementation is on track, a reviewer should be able to say:

1. `Plan` is obviously the signature surface
2. `Groceries` feels operational, not decorative
3. `Review` feels calm and trustworthy, not gamified
4. `Movement` feels like a useful supporting studio, not a separate product
5. removing 30% of the cards would not improve the design, because the cards that remain actually earn their existence

## Wedge Component Vocabulary

The wedge introduces a distinct component vocabulary.

This is how the design system becomes implementable.

### Board grammar components

#### `PlanBoard`

- job: hold the 7-day rhythm
- surface type: primary workspace
- should feel like: a calm operations desk
- extends: layout shell, not generic repeated cards

#### `PlanDayColumn`

- job: group one day’s meal / workout / note slots
- surface type: board lane
- should feel like: quiet structure, not a boxed dashboard card

#### `PlanSlotCard`

- job: represent one meal, workout, or note
- surface type: compact operational object
- should feel like: tactile, compact, clear
- extends: planner-specific card variant, not default briefing card

#### `PlanSlotStatusChip`

- job: show `planned`, `done`, `skipped`, `missing`
- surface type: compact state token
- should feel like: immediate, factual, glanceable

#### `BoardActionButton`

- job: repeated local board actions
- surface type: compact planner-specific action
- should feel like: utilitarian, not ornamental
- extends: button primitive with planner-specific variant

### Ledger grammar components

#### `MergedGroceryChecklist`

- job: present one operational grocery surface from manual + derived sources
- surface type: ledger
- should feel like: fast to scan, low-drama, durable

#### `MergedGroceryRow`

- job: one visible grocery row, potentially backed by multiple sources
- surface type: dense checklist row
- should feel like: operational, not cardy
- extends: checklist-row variant, not generic card

#### `ProvenanceChip`

- job: show `manual`, `recipe`, or source context
- surface type: compact metadata token
- should feel like: subtle support context, not primary content

### Briefing grammar components

#### `ReviewBriefingBlock`

- job: communicate weekly meaning and next decisions
- surface type: narrative briefing
- should feel like: calm, editorial, trustworthy
- extends: briefing surface, where `Newsreader` can still appear

#### `AdherenceAuditSection`

- job: explain what counted, missed, or was inferred
- surface type: operational audit nested inside Review
- should feel like: exact, transparent, non-defensive
- extends: review-specific section, not a separate page pattern

### Movement studio components

#### `WorkoutTemplateStudio`

- job: full workout template authoring
- surface type: supporting studio
- should feel like: focused, useful, not product-marketing UI
- extends: shared workout authoring components and state helpers

#### `InlineWorkoutComposer`

- job: lightweight planner-side shell over the same workout draft system
- surface type: inline planner tool
- should feel like: smaller, faster, same underlying logic
- extends: shared authoring subcomponents, not a separate editor system

## Responsive And Accessibility Rules

The wedge is too interaction-heavy to rely on “stack it on mobile.”

Each major surface needs an intentional responsive behavior.

### Plan

- desktop:
  - full 7-day board visible
  - support context may live beneath or beside the board
- tablet:
  - retain day-column logic
  - reduce per-slot density
  - move support context beneath the board
- mobile:
  - default to a day-stack or swipeable day model
  - preserve the sense of weekly rhythm through headers and progress, not tiny unreadable columns
  - `Plan` remains top-level in mobile nav

### Groceries

- desktop:
  - checklist grouped by aisle / ingredient with provenance chips visible
- tablet:
  - same grouping, reduced metadata density
- mobile:
  - one-column ledger
  - checklist interaction remains fast and thumb-friendly
  - provenance may collapse behind disclosure, but item state must remain first-scan obvious

### Movement

- desktop:
  - full template studio with search and editor visible
- tablet:
  - search and template editing may stack vertically
- mobile:
  - editor becomes sequential
  - exercise row editing must remain possible without horizontal scrolling

### Today

- desktop:
  - next due items and daily context can coexist
- mobile:
  - show next due planned items first
  - check-in remains compact and thumb-friendly
  - stale plan warnings stay visible near the action they affect

### Review

- desktop:
  - briefing first, adherence audit second
- tablet / mobile:
  - preserve top-down narrative order
  - do not flatten into dashboard cards
  - the adherence audit remains subordinate to the briefing

## Accessibility Baseline

- all interactive controls must support keyboard navigation
- all primary interactive targets must meet a 44px minimum touch target
- all pages must expose clear landmark structure
- board and checklist interactions must preserve visible focus states
- status is never color-only:
  - planned / done / skipped / missing need text + shape + color distinction
- contrast must stay readable against the warm neutral palette
- any optional media must never be required to understand the action or state

## Review And Adherence Tone Rules

The wedge only works if the product tells the truth without sounding punitive.

### Tone standard

- factual
- low-drama
- adult
- clear
- trustworthy

### Allowed language

- missed
- skipped
- shifted
- not completed
- inferred
- stale
- needs attention

### Not allowed

- guilt-heavy or moralizing copy
- “you failed”
- gamified score language
- fake coaching voice
- therapy-ish reassurance in operational surfaces

### Implementation rule

- `Review` headline remains calm and reflective
- adherence audit copy is exact and operational
- every miss or inference should include:
  - what happened
  - why the system thinks that happened
  - what the user can do next

The user should feel informed, not graded.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status   | Findings                                                                                                                                               |
| ------------- | --------------------- | ------------------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 1    | COMPLETE | Weekly execution wedge chosen, recovery-aware daily adaptation and integrated health journal deferred                                                  |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —        | —                                                                                                                                                      |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | COMPLETE | Architecture, migration, validation, derivation, performance, and test expectations were made explicit                                                 |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 1    | COMPLETE | Information architecture, interaction states, emotional journey, anti-slop rules, design-system vocabulary, responsive behavior, and tone rules locked |

**VERDICT:** CEO + ENG + DESIGN aligned enough to implement the wedge.

## Phase 2 And Phase 3

### Phase 2: Recovery-Aware Daily Adaptation

Add:

- downgrade / simplify the day when sleep or symptoms degrade
- meal and workout fallback suggestions
- recovery-aware Today surface

### Phase 3: Integrated Health Journal

Add:

- stronger symptom / mood / context stream
- journal-driven pattern capture
- more useful review loops from mental-health and body-signal context

These matter.

They are not the wedge.

## Distribution Plan

Initial distribution:

- local-first web app
- desktop/mobile browser usage
- later optional iOS companion and shortcuts remain supporting distribution, not the wedge

Non-goals for initial wedge:

- app store launch as the primary go-to-market
- cloud-hosted multi-user product
- enterprise distribution

## Dependencies

- existing local-first SvelteKit + Bun stack
- existing nutrition and review substrate
- weekly planning domain already partially implemented in current working tree
- free-source bootstrap from Open Food Facts, USDA, TheMealDB, and wger

## The Assignment

Build the smallest version of the weekly execution wedge that feels complete enough to use every Sunday night:

- weekly board
- workout slots
- meal slots
- grocery generation
- today handoff
- review adherence

Everything else is phase 2 or phase 3.

## What I Notice About The Product Direction

The best version of this product is not “free competitor bundle.”

It is “the weekly health operating system.”

That’s the story worth building.

## Engineering Decisions Locked

The following decisions were locked during `/plan-eng-review` and should be treated as implementation constraints, not open questions:

### Scope

- wedge scope stays: weekly board, meal slots, workout slots, grocery generation, Today handoff, Review adherence
- recovery-aware daily adaptation is phase 2
- integrated health journal is phase 3

### Storage and migration

- `bun:sqlite` is the canonical storage truth for the wedge
- `plannedMeals` becomes compatibility-only fallback
- `PlanSlot` always wins over legacy `plannedMeals`
- migration is explicit:
  1. freeze `plannedMeals` writes
  2. migrate legacy planned meals into `PlanSlot`
  3. allow read-only fallback while migration completes
  4. remove the old path after stability

### Domain ownership

- `planning` remains the center of the weekly execution loop
- `Today` and `Groceries` may write related planning state directly, but only through explicit shared contracts and tests
- `Movement` keeps the full workout editor
- `Plan` gets a lightweight inline workout creator
- both `Plan` and `Movement` must share one workout-authoring draft model, shared state helpers, and shared editor subcomponents

### Grocery model

- manual and derived groceries are both in scope for the wedge
- storage is split:
  - `DerivedGroceryItem`
  - `ManualGroceryItem`
- UI shows one merged checklist
- duplicate-looking rows must be merged into one visible checklist row
- merged checklist assembly and fan-out writes live in one canonical grocery checklist read-model service shared by `Plan` and `Groceries`

### Adherence model

- plan adherence is inferred, not only driven by explicit slot status
- inferred matches are persisted
- persisted matches live in a dedicated `AdherenceMatch` table
- matches are invalidated by a deterministic week fingerprint
- adherence is a dedicated operational section inside `Review`, not its own route/page in the wedge
- `Review` is the narrative weekly briefing
- the adherence section inside `Review` is the operational audit surface
- one shared adherence presenter / read model powers both the summary and the deeper audit detail inside `Review`

### Validation and derivation

- `zod` is required now, not later
- every external adapter boundary and planning write contract must validate at runtime
- groceries and review-related projections are eagerly recomputed on write
- write strategy:
  - core write plus recomputes run in one transaction
  - if downstream recompute fails, the whole write fails
- recomputes are week-scoped by default
- cross-week recomputes are allowed only for explicitly named cases
- external APIs are banned from wedge-critical reads and writes
- selective external fetches are allowed only for non-blocking planner surfaces like optional thumbnails or exercise details

### Performance constraints

- add explicit indexes now for all week-scoped and join-like lookups
- especially:
  - `weekStart`
  - `weeklyPlanId + localDay`
  - grocery-source relations
  - `AdherenceMatch` by `weekStart + planSlotId + fingerprint`

### Anti-slop guardrail

- no new helper / utility / presenter / store modules outside the domains explicitly chosen above unless they remove real duplication proven during implementation

## What Already Exists

- nutrition catalog, recipes, packaged-food lookup, USDA enrichment, and recommendations
- today execution flow and nutrition pulse
- review summary and adherence framing
- movement exercise caching and workout templates
- local-first app shell and sqlite-backed persistence

These are to be reused.

Do not rebuild them under new names.

## Not In Scope

- cloud sync
- social features
- grocery delivery integrations
- AI therapist / general AI coach
- full workout-video ingestion system
- app-store-first launch
- enterprise distribution
- rebuilding nutrition or review as new planner-specific systems

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status      | Findings                                                                |
| ------------- | --------------------- | ------------------------------- | ---- | ----------- | ----------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 1    | COMPLETE    | Weekly execution wedge chosen over broader tracker scope                |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —           | —                                                                       |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | IN PROGRESS | Architecture and test plan materially tightened, decisions locked above |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | —           | —                                                                       |

**VERDICT:** CEO direction is clear. Eng direction is now concrete enough to implement once this review is fully closed.
