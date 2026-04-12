# Developer Guide

Status: Active  
Date: 2026-04-10

This file is for people changing the live codebase.

Read this after [ARCHITECTURE.md](../ARCHITECTURE.md).

## What Kind Of App This Is

This project is a private, local-first health operating system.

That means:

- one user
- no default dependency on remote APIs for core usefulness
- personal health data is treated as sensitive by default
- the app should remain useful even when integrations are unavailable

If a change makes the app more dependent on a network, more magical, or less inspectable, that is a smell.

## Development Workflow

Normal loop:

```sh
bun install
bun run check
bun run dev
```

Verification loop:

```sh
bun run test:unit
bun run test:smoke
bun run build
bun run check:operational
```

Use targeted unit or E2E runs whenever a change is local to one feature.

## Module Ownership Rules

Use the real owner module, not a convenience wrapper.

Examples:

- feature-local persistence and lookup logic lives in `service.ts`, `store.ts`, `lookup.ts`, or `summary.ts`
- page state and pure state transitions live in `state.ts`
- mutation orchestration lives in `actions.ts`
- page-level orchestration lives in `controller.ts`
- assembled read models live in `snapshot.ts`

Good:

```text
nutrition route -> nutrition/state.ts + nutrition/actions.ts + nutrition/store.ts
```

Bad:

```text
route -> feature barrel -> barrel -> actual module
```

This codebase has already removed a lot of low-value barrels. Keep going in that direction unless a wrapper adds real value.

## Svelte 5 Rules

Use current Svelte 5 style.

- Prefer runes-first patterns.
- Avoid introducing legacy syntax.
- Keep component logic explicit.
- Do not add effects unless there is a real side effect.
- Keep UI state near the component or feature state module that owns it.

Quick checklist:

- no `export let` in new code
- no `on:click` in new code
- no `$:` legacy reactive statements in new code
- no random `onMount` when a clearer pattern exists
- typed props and typed helper boundaries

## How To Change A Feature

Use this sequence:

1. Find the route entrypoint under `src/routes`
2. Find the feature module under `src/lib/features/<feature>`
3. Identify whether the change is:
   - UI only
   - state transition only
   - mutation path
   - service / persistence path
4. Add or run the narrowest regression test first
5. Make the smallest change that improves the code
6. Re-run focused tests and `bun run check`

## Feature Change Heuristics

### UI change

Touch:

- `Page.svelte`
- child components
- `model.ts`

Verification:

- component test first
- E2E only if the user flow matters

### Mutation change

Touch:

- `actions.ts` or `controller.ts`
- route handler if request shape changes
- service layer only if persistence changes

Verification:

- unit tests for the action/controller
- route test when request contract changed
- downstream regression if the mutation refreshes review state

### Persistence / computation change

Touch:

- `service.ts`, `store.ts`, `summary.ts`, `snapshot.ts`

Verification:

- unit tests around affected behavior
- review any consumers using the returned shape

## Review Refresh Rule

Many mutations intentionally refresh weekly review artifacts.

If you touch any of these flows, assume review can regress:

- health
- nutrition
- planning
- groceries
- sobriety
- today
- imports
- assessments
- journal

That means a cleanup in one feature may need a review regression test as proof.

## Documentation Rule

If you change code structure, update docs in the same tranche:

- [README.md](../README.md) for commands or repo map
- [docs/README.md](README.md) for source-of-truth ordering
- [ARCHITECTURE.md](../ARCHITECTURE.md) for live code structure

If a diagram is stale, fix it now. Stale diagrams are worse than no diagrams.

## Cleanup Rule

Good cleanup:

- removes repeated orchestration
- removes dead wrappers
- makes ownership clearer
- keeps the diff local
- keeps the tests green

Bad cleanup:

- “improves architecture” without a concrete smell
- creates a shared base abstraction after seeing two similar functions
- changes behavior while claiming refactor-only
- widens from one feature into five because the names look similar

## World-Class Health App Bar

For this product, “clean” means:

- personal data flow is obvious
- failure states are explicit
- local-first flows remain reliable
- health / recovery / review interactions are easy to trace
- docs match the real code

That is the bar.
