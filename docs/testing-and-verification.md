# Testing And Verification

Status: Active  
Date: 2026-04-10

This project is a health app. Cleanup without proof is not acceptable.

Use this file to decide what to run before you say a change is done.

## Default Commands

Baseline:

```sh
bun run check
```

Core verification:

```sh
bun run test:unit
bun run test:smoke
bun run build
bun run check:operational
```

## Test Layers

```text
tests/core/
  framework and infrastructure invariants

tests/features/unit/
  service, controller, state, route, client logic

tests/features/component/
  route-level and component-level feature behavior

tests/features/e2e/
  browser flows through the real app
```

## What To Run For Each Change Type

### Structural cleanup

Examples:

- removing wrappers
- changing import ownership
- extracting local helpers
- moving types between modules

Run:

- focused unit tests for touched features
- `bun run check`

Usually do not need:

- full E2E

### Route contract change

Examples:

- request body parsing
- route schema changes
- action routing changes

Run:

- route unit tests
- affected controller/service tests
- `bun run check`

### Mutation path change

Examples:

- saving today check-in
- logging health events
- import preview/commit
- saving review experiment

Run:

- affected action/controller tests
- downstream review/timeline/today regressions if the mutation updates shared artifacts
- `bun run check`

### User-visible flow change

Examples:

- imports flow
- review page output
- daily check-in journey
- shell navigation

Run:

- component tests if available
- targeted E2E grep
- `bun run check`

### Operational / serving change

Examples:

- preview serving
- health/status endpoint
- startup checks

Run:

- `bun run build`
- `bun run test:smoke`
- `bun run check:operational`

## Current High-Value Targeted Commands

Examples already used successfully on this repo:

```sh
bun run test:e2e --grep "weekly review surfaces journal context signals"
bun run test:e2e --grep "iphone companion bundle import lands in timeline and review"
```

Use targeted grep runs before escalating to the full E2E suite.

## Review Refresh Dependencies

These feature mutations can affect weekly review output:

- health
- nutrition
- planning
- groceries
- sobriety
- today
- assessments
- journal
- imports

If you change one of those mutation paths, consider a review regression test part of the proof.

## Failure Modes To Watch

For every cleanup or refactor, ask:

1. Could this silently drop a user-visible notice?
2. Could this stop review artifacts from refreshing?
3. Could this break local-first behavior while unit tests still pass?
4. Could this make a route import or client import stale?

If yes, add a regression test before moving on.

## Evidence Standard

A valid completion claim should cite one of:

- exact command run
- exact failing blocker

Bad:

```text
This should be fine now.
```

Good:

```text
`bun run check` passed
`bun run test:unit tests/features/unit/review/service.test.ts` passed
```

## When To Stop A Cleanup Slice

Stop the slice when:

- the next edit would require touching a second or third feature area without strong reason
- the verification set starts getting broad and expensive
- the next step is architectural instead of cleanup
- the docs are now the higher-value target

Small green slices beat giant clever cleanups.
