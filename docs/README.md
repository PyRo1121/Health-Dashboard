# Health Docs Map

Status: Active
Date: 2026-04-12

This repo now has enough planning material that you need a source-of-truth map.

Without it, implementation will drift because different docs say the same thing at different levels.

## Read Order

1. [DESIGN.md](../DESIGN.md)
2. [health cockpit white paper](health-cockpit-whitepaper.md)
3. [architecture](../ARCHITECTURE.md)
4. [developer guide](developer-guide.md)
5. [API reference](api-reference.md)
6. [data model](data-model.md)
7. [feature flows](feature-flows.md)
8. [feature reference](feature-reference.md)
9. [operations runbook](operations-runbook.md)
10. [privacy and local-first model](privacy-and-local-first.md)
11. [external data sources](external-data-sources.md)
12. [maintenance guide](maintenance-guide.md)
13. [testing and verification](testing-and-verification.md)
14. [bleeding-edge health OS plan](designs/2026-04-12-bleeding-edge-health-os-plan.md)
15. [world-class forward plan](designs/2026-04-12-world-class-forward-plan.md)
16. [Today Intelligence implementation packet](designs/2026-04-12-today-intelligence-implementation-packet.md)
17. [engineering plan](designs/2026-04-02-personal-health-cockpit-engineering-plan.md)
18. [tranche plan](designs/2026-04-02-personal-health-cockpit-tranche-plan.md)
19. [visual spec](designs/2026-04-02-personal-health-cockpit-visual-spec.md)
20. [T0/T1 implementation packet](designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md)
21. [T9/T10 implementation packet](designs/2026-04-02-personal-health-cockpit-implementation-packet-t9-t10.md)
22. [integration research](research/2026-04-02-health-integration-options.md)
23. [landscape notes](research/2026-04-02-health-dashboard-landscape.md)
24. [CI/CD enterprise audit (2026-04-05)](research/2026-04-05-cicd-enterprise-audit.md)
25. [CI workflow inventory](ops/ci-workflow-inventory.md)
26. [Grok PR automation](ops/grok-pr-automation.md)

## Source Of Truth By Topic

### Product direction

- Primary strategy: [bleeding-edge health OS plan](designs/2026-04-12-bleeding-edge-health-os-plan.md)
- Foundation strategy record: [world-class forward plan](designs/2026-04-12-world-class-forward-plan.md)
- Product thesis: [health cockpit white paper](health-cockpit-whitepaper.md)
- Live implementation source: [architecture](../ARCHITECTURE.md)
- Historical planning record: [bleeding-edge migration plan](designs/2026-04-10-bleeding-edge-migration-plan.md)

### Live implementation structure

- Primary: [architecture](../ARCHITECTURE.md)
- Supporting: [README](../README.md)

### Developer workflow

- Primary: [developer guide](developer-guide.md)
- Verification source: [testing and verification](testing-and-verification.md)

### API surface

- Primary: [API reference](api-reference.md)
- Supporting: [architecture](../ARCHITECTURE.md)

### Data ownership

- Primary: [data model](data-model.md)
- Supporting: [architecture](../ARCHITECTURE.md)

### Privacy and trust model

- Primary: [privacy and local-first model](privacy-and-local-first.md)
- Supporting: [data model](data-model.md)

### External dependency posture

- Primary: [external data sources](external-data-sources.md)
- Supporting: [privacy and local-first model](privacy-and-local-first.md)

### User and system flows

- Primary: [feature flows](feature-flows.md)
- Supporting: [API reference](api-reference.md)

### Feature ownership quick lookup

- Primary: [feature reference](feature-reference.md)
- Supporting: [architecture](../ARCHITECTURE.md)

### Execution order

- Primary strategic roadmap: [bleeding-edge health OS plan](designs/2026-04-12-bleeding-edge-health-os-plan.md)
- Foundation strategy record: [world-class forward plan](designs/2026-04-12-world-class-forward-plan.md)
- Current execution packet: [Today Intelligence implementation packet](designs/2026-04-12-today-intelligence-implementation-packet.md)
- Live implementation truth: [architecture](../ARCHITECTURE.md), [developer guide](developer-guide.md), [API reference](api-reference.md), and [feature reference](feature-reference.md)
- Historical execution record: [bleeding-edge migration plan](designs/2026-04-10-bleeding-edge-migration-plan.md)
- Archived tranche/packet set: the 2026-04-02 tranche and implementation packet docs

### Visual and UX rules

- Primary: [DESIGN.md](../DESIGN.md)
- Screen-level companion: [visual spec](designs/2026-04-02-personal-health-cockpit-visual-spec.md)

### Integrations and standards research

- Primary: [integration options](research/2026-04-02-health-integration-options.md)
- CI/CD baseline + gap analysis: [CI/CD enterprise audit (2026-04-05)](research/2026-04-05-cicd-enterprise-audit.md)
- CI/CD live workflow index: [CI workflow inventory](ops/ci-workflow-inventory.md)
- PR automation + threat monitoring: [Grok PR automation](ops/grok-pr-automation.md)

### Operations

- Primary: [operations runbook](operations-runbook.md)
- Verification source: [testing and verification](testing-and-verification.md)

### Maintenance and cleanup

- Primary: [maintenance guide](maintenance-guide.md)
- Supporting: [architecture](../ARCHITECTURE.md)

## Doc Status

- [architecture](../ARCHITECTURE.md), [developer guide](developer-guide.md), [API reference](api-reference.md), [data model](data-model.md), [feature flows](feature-flows.md), [feature reference](feature-reference.md), and [operations runbook](operations-runbook.md)
  - current living source of truth
- [bleeding-edge health OS plan](designs/2026-04-12-bleeding-edge-health-os-plan.md)
  - current forward-looking strategy source of truth
- [world-class forward plan](designs/2026-04-12-world-class-forward-plan.md)
  - superseded foundation plan for the current strategy
- [Today Intelligence implementation packet](designs/2026-04-12-today-intelligence-implementation-packet.md)
  - current execution source of truth for the next build phase
- [bleeding-edge migration plan](designs/2026-04-10-bleeding-edge-migration-plan.md)
  - historical execution record for the completed runtime/storage migration
- [bleeding-edge engineering review](designs/2026-04-10-bleeding-edge-health-fitness-eng-review.md)
  - historical review artifact
- [starter plan](designs/2026-04-02-personal-health-cockpit-starter-plan.md)
  - archived summary only
- [engineering plan](designs/2026-04-02-personal-health-cockpit-engineering-plan.md)
  - archived pre-migration strategy record
- [tranche plan](designs/2026-04-02-personal-health-cockpit-tranche-plan.md)
  - archived delivery plan from the Dexie-era architecture
- [visual spec](designs/2026-04-02-personal-health-cockpit-visual-spec.md)
  - archived design vocabulary from the original tranche set
- [T0/T1 implementation packet](designs/2026-04-02-personal-health-cockpit-implementation-packet-t0-t1.md)
  - archived first-build packet
- [T9/T10 implementation packet](designs/2026-04-02-personal-health-cockpit-implementation-packet-t9-t10.md)
  - archived native / clinical packet

## Historical Bootstrap Note

The 2026-04-02 tranche and packet docs describe the original bootstrap sequence.

They are preserved for historical context only.

For current implementation work, start from the living docs above, not the archived bootstrap packet set.

## Generated Design Boards

These boards were generated locally outside the repo and should be treated as local artifacts, not source-of-truth files:

- Today: `.gstack/projects/Health/designs/today-20260402/design-board.html`
- Journal: `.gstack/projects/Health/designs/journal-20260402/design-board.html`
- Review: `.gstack/projects/Health/designs/review-20260402/design-board.html`

## Approved Visual Directions

- Today: `variant-B`
- Journal: `variant-A`
- Review: `variant-B`

## Rule

If two docs conflict, prefer:

1. `DESIGN.md` for visual rules
2. [ARCHITECTURE.md](../ARCHITECTURE.md) for live implementation structure
3. the living docs in this folder for API/data/flow/operations guidance
4. historical design docs only for context, not current truth

Everything else is commentary.
