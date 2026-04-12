# Maintenance Guide

Status: Active  
Date: 2026-04-10

This file is for keeping the repo healthy over time.

Use it when you need to answer:
- how to approach refactors safely
- how to choose the next cleanup slice
- how to avoid rebuilding wrapper soup

## Working Rule

This repo should improve in small, verified slices.

Not giant “cleanup everything” waves.

## Preferred Refactor Shape

Good:

```text
one smell
  -> one feature slice
  -> targeted tests
  -> bun run check
  -> docs update if needed
```

Bad:

```text
twenty files
  -> broad abstraction
  -> hope tests catch it
```

## Structural Cleanup Rules

### Remove low-value wrappers

Safe when:
- the wrapper is a pure pass-through barrel
- ownership becomes clearer after removal
- import rewiring is mechanical
- tests stay focused

### Extract local helpers

Safe when:
- duplication is exact
- repeated orchestration stays inside one feature
- helper names describe the actual behavior

Examples:
- refresh + reload + notice paths
- repeated linked-context row assembly
- repeated persistence merge logic

### Extract shared helpers

Only when:
- the logic is genuinely domain-shared
- at least two modules need the same behavior
- the helper has a stable home under `src/lib/core/shared`

Current good examples:
- [plan-slots.ts](../src/lib/core/shared/plan-slots.ts)

## When Not To Refactor

Stop if:
- the next step is no longer based on a concrete smell
- the diff is getting too wide to reason about
- tests are broad and slow instead of precise
- the change becomes architectural instead of cleanup
- the docs are now the more important missing piece

## Choosing The Next Slice

Pick the next cleanup target using this order:

1. stale docs or mismatched implementation docs
2. dead wrappers / dead exports
3. repeated controller/action orchestration
4. repeated service-layer lookup/persistence logic
5. measured performance hotspots

Do not skip to step 5 because it sounds more impressive.

## Verification Standards

Minimum:

```sh
bun run check
```

Typical targeted proof:

```sh
bun run test:unit <affected tests>
```

When user flow changes:

```sh
bun run test:smoke
```

When a specific flow regresses:

```sh
bun run test:e2e --grep "<targeted flow>"
```

## Test Mapping Rule

If a cleanup touches:
- mutation logic
- route contracts
- import flows
- review refreshes
- state ownership

then there should be a targeted regression test proving it still works.

## Documentation Maintenance Rule

If you change the code structure, update:
- [README.md](../README.md)
- [docs/README.md](README.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)

If you change:
- route ownership
- action names
- data ownership
- user flow behavior

update:
- [api-reference.md](api-reference.md)
- [data-model.md](data-model.md)
- [feature-flows.md](feature-flows.md)

## Signs The Repo Is Healthy

- ownership is obvious
- wrappers exist only when they add real value
- feature-local orchestration is easy to trace
- review-refresh dependencies are explicit
- docs match code
- `bun run check` stays green during cleanup, not just at the end

## Signs The Repo Is Sliding

- every feature adds a new “helper base”
- docs describe a codebase that no longer exists
- imports route through wrappers instead of owners
- cleanup diffs get huge and unfocused
- tests only verify the happy path

## Cleanup Program Rule

Treat cleanup as an ongoing maintenance program, not a one-time rewrite.

That is how the codebase stays modern without becoming fragile.
