# Weekly Planner Design Addendum

Date: 2026-04-03  
Scope: deepen the existing design system for weekly planning, groceries, and movement

## Executive Call

The current design system is good.

It is calm, adult, and trustworthy.

But it is not yet distinctive enough for the planner phase.

The planner cannot look like “more of the same cards.”

It has to feel like the place where the week gets shaped.

## What stays

- warm neutral canvas
- `Manrope` for UI
- `Newsreader` for editorial emphasis
- pine / brass / rust accent logic
- low-drama trust model

Do not throw that out.

## What changes

## 1. Add a planning grammar

Current app grammar:

```text
briefing card + field stack + pill button
```

That works for Today and Review.

It is not enough for planning.

New grammar:

```text
Briefing grammar
  used by Today / Review

Board grammar
  used by Plan

Ledger grammar
  used by Groceries / Timeline / Imports
```

## 2. Make the planner board the iconic surface

The product needs one unmistakable visual surface.

That should be the weekly board.

### The board should feel like

- a calm operations desk
- part notebook, part schedule
- not kanban software
- not project management UI
- not generic mobile meal planner

### The board should show

- a 7-day rhythm
- visual contrast between meal, workout, and note slots
- quiet background structure
- compact but legible planning objects

## 3. Use imagery only where it helps recognition

### Allowed

- recipe thumbnail
- packaged food thumbnail
- exercise preview where the movement actually benefits from it

### Not allowed

- random stock photography
- giant hero images inside operational surfaces
- decorative media tiles with no decision value

This is a health operating system, not a content feed.

## 4. Adjust the primitive hierarchy

The current primitives are too uniform:

- [Card.svelte](/home/pyro1121/Documents/Health/src/lib/core/ui/primitives/Card.svelte)
- [Button.svelte](/home/pyro1121/Documents/Health/src/lib/core/ui/primitives/Button.svelte)
- [Field.svelte](/home/pyro1121/Documents/Health/src/lib/core/ui/primitives/Field.svelte)

Recommendation:

- do not replace them globally
- add new planner-specific variants and wrappers

### Needed variants

#### Slot card

- smaller radius than briefing cards
- tighter vertical rhythm
- stronger left-edge or top-edge state treatment
- image chip optional, never required

#### Checklist row

- denser than a card
- clear check state
- optional source badge
- one-scan grocery grouping

#### Board action button

- more compact than current pill CTA
- less ornamental
- usable in repeated rows and slot stacks

#### Status chip

- `planned`
- `done`
- `skipped`
- `missing`

These need text + shape + color distinction.

## 5. Mobile IA must change

If planning is the moat, mobile nav cannot hide it.

Current mobile loop:

```text
Today | Journal | Review | More
```

Recommended mobile loop:

```text
Today | Plan | Review | More
```

Journal can move under Today or More.

That is not a demotion.

It is putting the highest-frequency execution surfaces first.

## 6. Typography usage should get sharper

Keep the fonts.

Change the way they are used.

### Board grammar

- day headers: `Manrope`, tighter and more operational
- slot titles: `Manrope`, medium or semibold
- board metadata: smaller mono or small ui text

### Briefing grammar

- keep `Newsreader` for headline moments
- do not use `Newsreader` inside dense board surfaces

### Ledger grammar

- favor compact `Manrope`
- use `IBM Plex Mono` only for true machine-ish data

## 7. Motion rules for the planner

Motion must feel useful, not cute.

### Allowed

- slot insertion fade/slide
- completion state shift
- checklist row collapse
- board column emphasis on focus

### Avoid

- bouncy movement
- overscaled hover effects
- animated gradients
- motion that makes the planner feel toy-like

## 8. Color usage must stay restrained

Do not add more accent colors.

Use the existing palette more intentionally:

- pine for active commitment and completed good states
- brass for attention and “worth considering”
- rust for warning / friction / review flags
- oxblood only for serious risk or distress surfaces

### Board-specific color logic

- meal slots: mostly neutral, small pine or brass indicators
- workout slots: neutral with stronger pine structure
- notes: quiet neutral only
- grocery states: checked muted, excluded warm-gray, missing rust

## 9. Planner layout recommendation

### Desktop

```text
| Planner header                                  |
| Week controls | grocery summary | adherence cue |

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|-----|-----|-----|-----|-----|-----|-----|
|slot |slot |slot |slot |slot |slot |slot |
|slot |slot |slot |slot |slot |slot |slot |
```

### Mobile

```text
[ Week header ]
[ Day tabs / compact date rail ]

[ Monday stack ]
  meal slot
  workout slot
  note slot

[ Tuesday stack ]
...
```

Do not try to force the 7-column desktop board into mobile.

That is how planner UIs become unusable.

## 10. Signature moments

These are the 30-minute details that make it feel world-class.

1. grocery items show which recipe created them
2. planned meal projection is visible from Today
3. workout slot shows the one detail that matters most, not five
4. empty planner day does not look broken, it looks intentional
5. review cards deep-link back into the planner and nutrition surfaces

## Proposed DESIGN.md insert

```markdown
## Planner Surface Grammar

- The planner is the product's primary board surface and should not reuse briefing cards unchanged.
- Use a dedicated slot-card grammar with tighter rhythm, clearer state signaling, and lower chrome.
- Distinguish meal, workout, and note slots by structure first, color second.
- Use source-bound imagery only where it improves recognition speed.

## Ledger Surface Grammar

- Grocery and checklist views should be flatter, denser, and more operational than briefing surfaces.
- Rows beat cards in high-frequency checklist contexts.

## Mobile Navigation Priority

- Primary mobile loop: Today, Plan, Review, More.
- Planner access should never be buried in secondary navigation.
```

## Final Design Recommendation

Do not redesign the whole app.

Deepen it.

The planner should feel like the first surface that turns the current tasteful system into a product with a face.

That is enough.
