# Health Docs Map

Status: Active
Date: 2026-04-02

This repo now has enough planning material that you need a source-of-truth map.

Without it, implementation will drift because different docs say the same thing at different levels.

## Read Order

1. [DESIGN.md](/home/pyro1121/Documents/Health/DESIGN.md)
2. [engineering plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md)
3. [tranche plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md)
4. [visual spec](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-visual-spec.md)
5. [T0/T1 implementation packet](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md)
6. [T9/T10 implementation packet](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t9-t10.md)
7. [integration research](/home/pyro1121/Documents/Health/docs/research/2026-04-02-health-integration-options.md)
8. [landscape notes](/home/pyro1121/Documents/Health/docs/research/2026-04-02-health-dashboard-landscape.md)

## Source Of Truth By Topic

### Product direction

- Primary: [engineering plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md)
- Supporting: [landscape notes](/home/pyro1121/Documents/Health/docs/research/2026-04-02-health-dashboard-landscape.md)

### Execution order

- Primary: [tranche plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md)
- First build packet: [T0/T1 implementation packet](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md)
- Next integration packet: [T9/T10 implementation packet](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t9-t10.md)

### Visual and UX rules

- Primary: [DESIGN.md](/home/pyro1121/Documents/Health/DESIGN.md)
- Screen-level companion: [visual spec](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-visual-spec.md)

### Integrations and standards research

- Primary: [integration options](/home/pyro1121/Documents/Health/docs/research/2026-04-02-health-integration-options.md)

## Doc Status

- [starter plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-starter-plan.md)
  - archived summary only
  - keep for historical context, not implementation
- [engineering plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-engineering-plan.md)
  - current product and architecture source of truth
- [tranche plan](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-tranche-plan.md)
  - current delivery source of truth
- [visual spec](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-visual-spec.md)
  - current screen and component vocabulary source of truth
- [T0/T1 implementation packet](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md)
  - current first-build source of truth
- [T9/T10 implementation packet](/home/pyro1121/Documents/Health/docs/designs/2026-04-02-personal-health-cockpit-implementation-packet-t9-t10.md)
  - current native / clinical next-step source of truth

## Before Implementation

Do these before serious build work starts:

1. start from the `T0/T1` implementation packet
2. scaffold the repo and schema exactly once
3. keep design decisions aligned to approved visual directions
4. only then move into `T2` and `T3`

## Generated Design Boards

- Today: [design-board.html](/home/pyro1121/.gstack/projects/Health/designs/today-20260402/design-board.html)
- Journal: [design-board.html](/home/pyro1121/.gstack/projects/Health/designs/journal-20260402/design-board.html)
- Review: [design-board.html](/home/pyro1121/.gstack/projects/Health/designs/review-20260402/design-board.html)

## Approved Visual Directions

- Today: `variant-B`
- Journal: `variant-A`
- Review: `variant-B`

## Rule

If two docs conflict, prefer:

1. `DESIGN.md` for visual rules
2. engineering plan for architecture
3. tranche plan for delivery order
4. visual spec for screen-level interpretation

Everything else is commentary.
