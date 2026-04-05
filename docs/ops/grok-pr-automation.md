# Grok PR Automation

This repo uses Grok as the primary PR manager and AI review/fix engine.

## What Runs Automatically

- `ai-review-grok-super.yml`
  - reviews every PR update
  - posts one stable review comment
  - syncs Grok review labels
- `pr-manager-grok.yml`
  - keeps PR labels and the PR manager comment in sync
  - classifies docs, automation, dependency, and large PRs
- `ai-auto-fix-grok.yml`
  - runs only when `ai-auto-fix` is applied
  - same-repo trusted branches only
  - refuses protected paths
  - validates the patch before pushing
  - adds `ai-fix-applied` after a successful push
- `grok-threat-monitor.yml`
  - runs every 6 hours
  - reviews dependency and workflow-action risk
  - uses xAI `web_search` and `x_search`
  - updates a rolling threat-monitor issue

## Managed Labels

- `ai-auto-fix`
- `ai-fix-applied`
- `automerge`
- `grok-reviewed`
- `grok-approved`
- `has-patch`
- `needs-review`
- `security-issue`
- `threat-monitor`
- `dependencies`
- `automation`
- `docs-only`
- `large-pr`
- `do-not-merge`
- `work-in-progress`

Canonical definitions live in [`.github/labels.json`](../../.github/labels.json).

## Operating Model

1. Open or update a PR.
2. Grok review runs automatically.
3. If a patch is available, add `ai-auto-fix`.
4. If Grok pushes a fix, the PR gets `ai-fix-applied` and the patch label is cleared.
5. If the PR is ready to merge after checks and human approval, add `automerge`.
6. Use `do-not-merge` or `work-in-progress` to stop automation immediately.

## Guardrails

- Auto-fix is disabled for fork PRs.
- Auto-fix refuses workflows, tests, docs, lockfiles, config files, and package manifests.
- Auto-fix runs on labeled `pull_request` events instead of `pull_request_target`.
- Grok review and fix scripts use xAI Responses API with `store: false`.
- Search is restricted to official documentation and selected X accounts where possible.

## Threat Monitor

The threat monitor is a rolling operational issue, not a merge gate.

It combines:

- direct dependency inventory from `package.json` / `bun.lock`
- workflow action inventory from `.github/workflows`
- OSV advisory lookups
- xAI `web_search`
- xAI `x_search`

It runs every 6 hours and updates one open issue labeled `threat-monitor`.
