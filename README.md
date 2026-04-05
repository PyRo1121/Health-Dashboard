# Personal Health Cockpit

Private, local-first health operating system for daily check-ins, planning, nutrition, sobriety, journaling, imports, and review.

## Stack

- SvelteKit 2 + Svelte 5
- Bun 1.3.10
- Vitest for unit and component coverage
- Playwright for end-to-end coverage
- Local SQLite / Dexie-backed data storage

## Quickstart

```sh
bun install
cp .env.example .env
bun run check
bun run dev
```

Open the app at `http://localhost:5173`.

## Commands

```sh
bun run dev
bun run check
bun run lint
bun run test:unit
bun run test:component
bun run test:e2e
bun run build
```

For Playwright on a fresh machine:

```sh
bunx playwright install --with-deps chromium
```

## Environment

The app runs without external APIs for most flows. These variables are optional unless you want the related integrations:

- `USDA_FDC_API_KEY` or `FDC_API_KEY` for USDA nutrition enrichment
- `HEALTH_DB_PATH` to override the local SQLite database path
- `XAI_API_KEY` for Grok review, auto-fix, PR management, and threat monitoring
- `XAI_COLLECTION_IDS` for optional repo-policy / internal-doc grounding in Grok automation

## Repo Map

- `src/` application code
- `tests/` unit, component, and end-to-end coverage
- `docs/` product, design, and research source-of-truth docs
- `apps/ios-companion/` iOS HealthKit companion
- `apps/ios-shortcuts/` shortcut export assets

Start with [docs/README.md](docs/README.md) for the doc map and [DESIGN.md](DESIGN.md) for the visual system.

## CI

GitHub Actions is expected to run:

- typecheck
- lint
- unit tests
- component tests
- end-to-end tests
- production build
- Grok PR review with structured findings and labels
- label-gated Grok auto-fix for same-repo trusted branches
- label-gated Grok CI surgeon for failed PR checks on trusted same-repo branches
- PR manager label/comment sync for docs, automation, dependency, and large PRs
- 6-hour Grok dependency / CVE / threat monitor issue updates
- CodeQL SAST
- dependency and vulnerability scanning (Dependency Review + Snyk + Trivy in release)
- release artifact signing and attestations
- label-gated auto-merge for approved PRs (`automerge`)
- auto-drafted release notes per PR via Release Drafter
- automated changelog refresh PRs on `main` via git-cliff

Automation details live in [docs/ops/grok-pr-automation.md](docs/ops/grok-pr-automation.md).
