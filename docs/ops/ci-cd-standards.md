# CI/CD Controls Standard

Status: Active
Date: 2026-04-07
Scope: GitHub Actions workflow governance and merge requirements

## Required Status Checks

All pull requests must pass these exact named checks before merging:

| Check Name          | Workflow File | Purpose                             |
| ------------------- | ------------- | ----------------------------------- |
| `Lint`              | `ci.yml`      | ESLint + Prettier format validation |
| `Type Check`        | `ci.yml`      | TypeScript strict type checking     |
| `Dependency Review` | `ci.yml`      | Dependency vulnerability scanning   |
| `Unit Tests`        | `ci.yml`      | Vitest unit test suite              |
| `Component Tests`   | `ci.yml`      | Vitest component test suite         |
| `Build`             | `ci.yml`      | Production build verification       |
| `CI Config`         | `ci.yml`      | Workflow/config regression harness  |
| `E2E`               | `e2e.yml`     | Playwright end-to-end tests         |
| `CodeQL`            | `codeql.yml`  | GitHub Advanced Security SAST       |

Branch protection enforces: ** Require branches to be up to date before merging (strict) **

## Merge Authority

**Manual merge only** — automation never merges automatically.

Mergify is configured at the repository level but is **not a required merge gate**. The sole merge authority is a human with write access clicking "Merge" after all required status checks pass.

## Grok Review — Advisory Only

The Grok AI review workflow (`.github/workflows/ai-review-grok-super.yml`) is **read-only and advisory**. It posts PR comments and labels but does not block merge. It does not have authority to approve or reject a PR.

Required permissions: `pull-requests: write` (comments/labels only), `contents: read`.

## Grok Auto-Fix — Trusted Only

The Grok auto-fix workflow (`.github/workflows/ai-auto-fix-grok.yml`) is **restricted to same-repo trusted branches only**.

Guard conditions:

- PR must be from the same repository (not a fork)
- PR author must be OWNER, MEMBER, or COLLABORATOR
- Label `ai-auto-fix` must be applied by a maintainer
- Patch is validated with `git apply --check` before apply
- Only `src/` files may be modified (`.github/`, `tests/`, `docs/`, config, and lockfiles are protected)
- `git add -A` is never used — only allowlisted files are staged

## CI Config Validation

A dedicated regression harness (`tests/ci/`) validates workflow and config invariants:

- Workflow YAML parses without errors
- Required permission blocks are least-privilege
- Fork PRs cannot reach mutation steps
- Protected paths are excluded from auto-fix
- Grok review workflow has no `workflow_dispatch` trigger

Run locally: `bun run test:ci-config`

## Secrets and Keys

| Secret                   | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `XAI_API_KEY`            | Grok review, auto-fix, PR management       |
| `XAI_COLLECTION_IDS`     | Optional repo-policy grounding collections |
| `XAI_MANAGEMENT_API_KEY` | Collections bootstrap workflow             |

`XAI_API_KEY` is required for Grok automation. Without it, Grok workflows skip gracefully.

## Action Pinning

All third-party GitHub Actions are pinned to full commit SHAs. Pinned actions:

- `actions/checkout@v6` → SHA pinned
- `actions/github-script@v8` → SHA pinned
- `oven-sh/setup-bun@v2` → SHA pinned
- `actions/dependency-review-action@v4` → SHA pinned
- `actions/upload-artifact@v7` → SHA pinned
- `actions/download-artifact@v8` → SHA pinned

Unpinned major version tags are not used for supply-chain hardening.

## What This Document Replaces

This document supersedes the `docs/research/2026-04-05-cicd-enterprise-audit.md` CI findings and the CI section of `README.md`.
