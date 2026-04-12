# Contributing

This project is a private, local-first health web app.

Treat it like a sensitive product, not a toy app.

## Core Rules

- Keep changes explicit.
- Prefer the real owning module over wrappers.
- Do not widen a cleanup slice just because adjacent files look similar.
- Do not change user-visible behavior while calling it “just a refactor.”
- Keep `bun run check` green at all times.

## Development Loop

```sh
bun install
bun run check
bun run dev
```

Before claiming a change is done, run the narrowest proof that matches the change:

```sh
bun run test:unit
bun run test:smoke
bun run build
bun run check:operational
```

Use targeted unit or E2E runs whenever possible.

## Svelte / SvelteKit Standards

This repo should track current Svelte 5 and SvelteKit 2 practices.

Do:

- use explicit module ownership
- keep feature-local helpers local
- prefer typed imports from the real module owner
- keep UI logic in components and feature state/model modules

Do not:

- introduce `export let` in new code
- introduce `on:click` in new code
- introduce `$:` legacy reactive statements in new code
- add speculative abstractions after seeing one or two repeated patterns

## Feature Structure

Typical feature files:

```text
Page.svelte
client.ts
state.ts
actions.ts
controller.ts
snapshot.ts
service.ts / store.ts / lookup.ts / summary.ts
model.ts
contracts.ts
```

Not every feature has every file. That is fine.

The rule is ownership clarity, not file-count symmetry.

## Cleanup Rules

Good cleanup:

- removes dead wrappers
- removes repeated orchestration
- adds one local helper for one real repeated pattern
- updates docs when code structure changes
- keeps tests focused

Bad cleanup:

- giant “clean up everything” diff
- generic base controller/service abstractions
- moving code around without changing clarity
- deleting useful boundaries just because they are small

## Docs Rule

If you change structure or feature ownership, update the docs in the same tranche:

- [README.md](README.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/README.md](docs/README.md)
- any relevant file under `docs/`

Important docs:

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/developer-guide.md](docs/developer-guide.md)
- [docs/testing-and-verification.md](docs/testing-and-verification.md)
- [docs/api-reference.md](docs/api-reference.md)
- [docs/data-model.md](docs/data-model.md)
- [docs/feature-flows.md](docs/feature-flows.md)
- [docs/operations-runbook.md](docs/operations-runbook.md)
- [docs/privacy-and-local-first.md](docs/privacy-and-local-first.md)
- [docs/maintenance-guide.md](docs/maintenance-guide.md)

## Testing Expectations

### Structural cleanup

Run:

- targeted unit tests
- `bun run check`

### Mutation path changes

Run:

- action/controller tests
- route tests if contract changed
- downstream review/timeline/today regressions if refresh behavior is involved

### User-visible flow changes

Run:

- component tests if available
- targeted E2E grep
- `bun run check`

## Health App Quality Bar

This repo is not allowed to get sloppy around:

- journal entries
- sobriety events
- symptom logs
- sleep context
- assessment results
- imported clinical or device data

If a change makes those flows harder to trace, harder to test, or more dependent on remote systems, it is a bad change.

## PR / Change Notes

When describing a change:

- name the files
- name the exact verification commands
- say what user-visible behavior changed, if any
- say what is still unverified, if anything

That is the standard.
