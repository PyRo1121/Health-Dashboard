# Grok PR Automation

This repo uses Grok as the primary PR manager and AI review/fix engine.

## What Runs Automatically

- `ai-review-grok-super.yml`
  - reviews every PR update
  - posts one stable review comment
  - syncs Grok review labels
- `pr-manager-grok.yml`
  - keeps PR labels and the PR manager comment in sync
  - classifies docs, automation, dependency, large PRs, and merge-readiness state
  - uses Grok function calling to record the single authoritative PR manager plan
- `ai-auto-fix-grok.yml`
  - runs only when `ai-auto-fix` is applied
  - same-repo trusted branches only
  - refuses protected paths
  - validates the patch before pushing
  - adds `ai-fix-applied` after a successful push
- `grok-threat-monitor.yml`
  - runs every 6 hours
  - reviews dependency and workflow-action risk
  - uses xAI `web_search`, `x_search`, and `code_interpreter`
  - uses xAI function calling to record findings and auto-fix candidates in one pass
  - updates a rolling threat-monitor issue
  - opens dependency-fix PRs for high-confidence updates when safe
- `grok-ci-surgeon.yml`
  - listens for failed `CI` / `E2E` workflow runs on trusted same-repo PRs
  - requires `ai-autopilot`
  - retries failed jobs once before surgery
  - ingests failing job logs
  - asks Grok for a bounded repair patch
  - validates before pushing a fix back to the PR branch
- `grok-pr-portfolio.yml`
  - runs every 6 hours
  - updates a rolling issue summarizing open PRs, failed checks, and pending checks
- `branch-protection-audit.yml`
  - audits the configured branch protection required checks
  - updates a rolling issue if there is drift
- `grok-collections-bootstrap.yml`
  - uploads repo policy docs into an xAI collection using a management key
  - prints the collection ID for `XAI_COLLECTION_IDS`
  - can be extended with Remote MCP-backed tools via `XAI_REMOTE_MCP_TOOLS_JSON`
  - xAI docs MCP is enabled by default unless `XAI_ENABLE_DOCS_MCP=false`

## Managed Labels

- `ai-auto-fix`
- `ai-fix-applied`
- `ai-autopilot`
- `automerge`
- `grok-reviewed`
- `grok-approved`
- `has-patch`
- `needs-review`
- `security-issue`
- `threat-monitor`
- `threat-high`
- `threat-medium`
- `threat-fix-pr`
- `dependencies`
- `automation`
- `docs-only`
- `large-pr`
- `blocked-ci`
- `blocked-review`
- `blocked-author`
- `merge-ready`
- `stale-review`
- `do-not-merge`
- `work-in-progress`

Canonical definitions live in [`.github/labels.json`](../../.github/labels.json).

## Operating Model

1. Open or update a PR.
2. Grok review runs automatically.
3. The PR manager keeps one current state label on the PR: `merge-ready`, `blocked-ci`, `blocked-review`, or `blocked-author`.
4. If a patch is available, add `ai-auto-fix`.
5. If Grok pushes a fix, the PR gets `ai-fix-applied` and the patch label is cleared.
6. If you want Grok to attempt repair on later CI/E2E failures, add `ai-autopilot`.
7. If the PR is `merge-ready`, add `automerge` and let Mergify finish it after approval.
8. Use `do-not-merge` or `work-in-progress` to stop automation immediately.

## Guardrails

- Auto-fix is disabled for fork PRs.
- Auto-fix refuses workflows, tests, docs, lockfiles, config files, and package manifests.
- Auto-fix runs on labeled `pull_request` events instead of `pull_request_target`.
- Grok review and fix scripts use xAI Responses API with `store: false`.
- PR manager and threat monitor now use xAI function calling for safe action recording.
- Mergify requires both `automerge` and `merge-ready`, and it refuses blocked state labels.
- Optional repo-policy grounding can be enabled by setting `XAI_COLLECTION_IDS`.
- Official xAI docs MCP is enabled by default. Disable it with `XAI_ENABLE_DOCS_MCP=false`.
- Optional extra Remote MCP tools can be enabled by setting `XAI_REMOTE_MCP_TOOLS_JSON`.
- Collections bootstrap requires `XAI_MANAGEMENT_API_KEY`.
- Search is restricted to official documentation and selected X accounts where possible.

## Issue Forms

Structured issue intake now exists for:

- automation exceptions
- threat-monitor triage
- branch-protection drift

These live under [`.github/ISSUE_TEMPLATE`](../../.github/ISSUE_TEMPLATE).

## Threat Monitor

The threat monitor is a rolling operational issue, not a merge gate.

It combines:

- direct dependency inventory from `package.json` / `bun.lock`
- workflow action inventory from `.github/workflows`
- OSV advisory lookups
- xAI `web_search`
- xAI `x_search`
- xAI `code_interpreter`
- xAI function-calling for recorded findings and fix candidates

It runs every 6 hours and updates one open issue labeled `threat-monitor`.
