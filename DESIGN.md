# DESIGN.md

Project: Personal Health Cockpit
Date: 2026-04-02
Status: Active

## What This Product Should Feel Like

This should feel like a private briefing room.

Not a hospital portal.

Not a startup dashboard.

Not a pastel self-care app.

The design target is:

- calm
- private
- deliberate
- data-literate
- emotionally adult

The user should feel:

- safe logging hard things
- clear about what matters today
- respected, not manipulated
- guided, not nagged

## Product Character

### It is

- personal
- reflective
- operational
- trustworthy
- quiet

### It is not

- gamified
- performative
- social
- hyper-medical
- generic SaaS

## Core Interface Rules

1. The product is timeline-first, not widget-first.
2. The app should read like a personal operating system, not a BI dashboard.
3. Cards earn their existence. Default to layout and typography, not box soup.
4. Every page gets one primary action, one secondary action, and visible context.
5. Empty states must feel intentional and useful.
6. Distress, relapse, or symptom logging must never feel punitive.
7. Weekly review should feel like a calm briefing, not an attention casino.

## Implementation Standards

For this codebase, the UI stack should default to:

- SvelteKit app shell
- `bits-ui` for low-level accessible primitives
- custom styling on top of those primitives
- `lucide-svelte` for icons
- `@testing-library/svelte` for component tests
- Playwright for end-to-end flows

Why:

- it is modern Svelte-native infrastructure
- it keeps accessibility and keyboard behavior from becoming an afterthought
- it avoids the visual sameness of pre-skinned component kits

## Type System

### Primary UI font

- `Manrope`

Why:

- clear, modern, low-drama, good numerals, strong for dense UI

### Reflective / editorial font

- `Newsreader`

Use for:

- major section headings
- journal prompts
- weekly review summaries

Why:

- adds humanity and thoughtfulness without turning the app into a magazine

### Monospace

- `IBM Plex Mono`

Use for:

- metric labels when needed
- import diagnostics
- provenance/source IDs

## Typography hierarchy

```text
Display:     Newsreader 40-52 / tight / rare use
Page title:  Newsreader 28-34 / calm, high-trust
Section:     Manrope 18-22 / semibold
Body:        Manrope 14-16 / regular
Meta:        Manrope 12-13 / medium
Data:        IBM Plex Mono 12-14 / medium
```

## Color System

No purple.

No candy gradients.

No cold clinical blue dominance either.

### Core palette

```text
Background:
  canvas-0   #F6F2EA
  canvas-1   #EEE8DE
  surface-0  #FBF8F3
  surface-1  #F1EBE2

Text:
  ink-0      #1F1D1A
  ink-1      #3A352E
  ink-2      #655E54

Primary accent:
  pine-0     #1F5C4A
  pine-1     #2E7A63

Secondary accent:
  brass-0    #A67C2E

Warning:
  rust-0     #B5543C

Risk / urgent support:
  oxblood-0  #7B2D26

Positive:
  moss-0     #5E7A3A
```

### Usage rules

- most of the interface should live in warm neutrals
- pine is the main action and navigation accent
- brass is for trend highlights and reflection moments
- rust and oxblood are reserved for warnings and safety states

## Layout Rules

## Desktop

Use a left-navigation shell with one main workspace and one secondary rail where useful.

```text
| Nav | Main content area                    | Context rail |
|-----|--------------------------------------|--------------|
|     | Today / Journal / Review / etc.      | optional     |
```

### Desktop principles

- nav is stable and low-chrome
- one dominant content column
- secondary rail only when it adds meaning, not because we can
- avoid 4-up and 5-up card grids

## Tablet

- collapse secondary rail beneath main content
- preserve nav clarity
- keep same content order as desktop

## Mobile

Use a bottom-nav or compact top-nav pattern with the four highest-value areas:

- Today
- Journal
- Review
- More

Mobile should prioritize:

- quick check-in
- fast sobriety logging
- simple food logging
- fast journal capture

Not every dense analytical view needs to be identical on mobile. Some review surfaces can become stacked narratives instead of mini dashboards.

## Navigation Model

### Primary nav

- Today
- Journal
- Nutrition
- Sobriety
- Assessments
- Timeline
- Review
- Imports
- Settings

### Order logic

This order matters.

It follows the user loop:

1. what is true today
2. what happened
3. what I consumed
4. how recovery is going
5. formal check-ins
6. full history
7. meaning and patterns
8. data intake
9. controls

## Information Hierarchy By Screen

## Today

```text
1. Day status / date / completion state
2. Quick check-in
3. Sobriety + craving
4. Food shortcuts
5. Journal prompt / recent note
6. Event stream
```

### Today must answer

- how am I today?
- what have I already logged?
- what do I still need to capture?

## Journal

```text
1. New entry action
2. Current day / current prompt
3. Recent entries
4. Filters / tags / linked contexts
```

### Journal must answer

- what happened?
- what mattered?
- how does it connect to the rest of my data?

## Review

```text
1. Weekly headline summary
2. Flags and drift
3. Trends
4. Explainable correlations
5. Experiment recommendation / decision
6. Reflection notes
```

### Review must answer

- what helped?
- what hurt?
- what changed?
- what should I try next?

## Imports

```text
1. Import source options
2. Recent import batches
3. Preview diff
4. Warnings / duplicates / conflicts
5. Commit action
```

### Imports must answer

- what data am I adding?
- what changed?
- what looks suspicious?
- is it safe to commit?

## Interaction State Coverage

| Feature     | Loading                                      | Empty                                           | Error                                         | Success                                    | Partial                                              |
| ----------- | -------------------------------------------- | ----------------------------------------------- | --------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Today       | subtle skeleton, never full-screen block     | warm first-use setup with one clear next action | inline retry + preserve entered data          | quiet confirmation, no confetti            | show saved sections and unsaved sections clearly     |
| Journal     | load recent entries quickly                  | prompt-led blank state, not "no entries"        | draft preserved, retry affordance             | entry appears in stream immediately        | linked events missing handled gracefully             |
| Sobriety    | immediate local optimistic update            | first-use explanation of streak logic           | never shame, just clear save failure          | show streak and context update             | craving saved but notes failed                       |
| Assessments | step progress visible                        | explain why and when to take each instrument    | validation and safety state clearly separated | score + context + next recommended cadence | partially answered resume state                      |
| Nutrition   | recent meals first, search second            | recurring meal creation prompt                  | bad match is editable, not terminal           | nutrient summary updates immediately       | meal saved but enrichment pending                    |
| Imports     | staged progress, file size and phase visible | explain supported sources                       | line-item warnings with action                | diff summary + commit success              | partial parse results, commit blocked until reviewed |
| Review      | narrative skeleton, not spinner wall         | explain minimum data needed for first review    | show which upstream data failed               | weekly briefing generated with drilldown   | some metrics unavailable but review still usable     |

## User Journey And Emotional Arc

| Step | User does                                  | User feels             | Design response                             |
| ---- | ------------------------------------------ | ---------------------- | ------------------------------------------- |
| 1    | opens Today                                | guarded, distracted    | one strong primary area, low noise          |
| 2    | logs quick state                           | relief if fast         | 30-second check-in, no heavy forms          |
| 3    | logs something hard, like craving or lapse | vulnerable             | warm tone, zero shame, contextual support   |
| 4    | writes journal entry                       | reflective             | generous writing space, quiet typography    |
| 5    | imports data                               | cautious               | preview diff, provenance, reversible commit |
| 6    | opens weekly review                        | curious, maybe anxious | calm briefing, explainable findings         |
| 7    | chooses next experiment                    | motivated              | one clear next step, not ten                |

## Empty State Principles

Every empty state needs:

- a human headline
- why this area matters
- one primary action
- one example of what "good" looks like

### Bad

- "No entries found"

### Good

- "Nothing logged yet today. Start with how you feel, then add anything that mattered."

## Safety-Sensitive UX

These areas need a different tone:

- sobriety lapse
- high distress
- PHQ-9 item 9 non-zero
- symptom spikes

Rules:

- no celebratory language
- no streak-guilt language
- no red panic walls unless truly urgent
- give immediate next actions
- explicitly say the app is not emergency care where relevant

## AI Slop Blacklist

Do not ship:

1. generic dashboard card mosaics
2. blue-purple wellness gradients
3. icon-in-circle feature grids
4. centered everything
5. oversized rounded rectangles everywhere
6. fake "wellness score" hero widgets
7. generic meditation-app emptiness
8. stock-illustration onboarding sludge

## Motion Rules

Motion should support orientation, not novelty.

Allowed motion:

- route transitions that reinforce navigation depth
- subtle save confirmation
- review reveal / progressive disclosure
- chart hover or focus feedback

Avoid:

- floating ambient blobs
- decorative motion loops
- bounce or playful motion in safety-sensitive flows

## Accessibility Rules

1. minimum 44px touch targets
2. all flows keyboard-complete
3. strong visible focus states
4. contrast meets WCAG AA minimums
5. charts never carry meaning by color alone
6. assessment flows announce progress to screen readers
7. import errors are structured and readable, not only color-coded
8. every route gets a unique page title
9. the app shell should expose obvious landmark structure for nav and main content

## Copy Rules

- direct
- kind
- specific
- no therapy-bot voice
- no startup landing-page voice
- no gamified guilt voice

Examples:

- "Cravings were higher on low-sleep days."
- "You logged three skipped lunches this week."
- "This answer suggests you may need more support than this app can provide."

## Design Decision Log

### Chosen

- local-first calm neutral design language
- typography-led layout, not card-led layout
- first-class journal screen
- explicit assessment cadence
- warm but adult tone
- weekly briefing instead of dashboard wallpaper
- Today direction locked to generated `variant-B`
- Journal direction locked to generated `variant-A`
- Review direction locked to generated `variant-B`
- mobile navigation locked to bottom-nav with Today / Journal / Review / More
- chart grammar locked to restrained line-first briefing visuals
- icon system locked to `lucide-svelte`
- primitive component layer locked to `bits-ui`
- component test layer locked to `@testing-library/svelte`

### Deferred

- component library naming
- higher-fidelity responsive refinements after implementation

## Immediate Design TODOs Before Implementation

1. turn approved screen directions into implemented Svelte routes
2. choose exact component primitives for forms, drawers, and timeline rows
3. validate responsive behavior against implemented screens
4. run live visual QA after first render pass

## Supporting Visual Spec

For screen blueprints, component vocabulary, chart grammar, and generated design exploration paths, use:

- [2026-04-02-personal-health-cockpit-visual-spec.md](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-visual-spec.md)

## Final Standard

If this ships and feels like a spreadsheet with rounded corners, it failed.

If it ships and feels like a private room where your life finally makes sense, it worked.
