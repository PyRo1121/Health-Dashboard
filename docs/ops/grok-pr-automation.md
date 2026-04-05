# Grok PR Automation

This repo uses Grok as the primary PR operator for review, bounded repair, and merge-readiness classification.

## 2026 Standards Alignment

- GitHub official actions use current Node 24-capable majors:
  - `actions/checkout@v6`
  - `actions/github-script@v8`
  - `actions/upload-artifact@v7`
- Grok automation uses the xAI Responses API with `store: false`.
- xAI docs MCP is enabled by default in the shared tooling layer and remote MCP tool definitions are normalized to the current `mcp` shape.
- `merge-ready` means ready for final human review only. Automation never merges.
- Mergify has been removed. There is one PR operator path in this repo.
- Release Drafter no longer auto-labels PRs. Grok owns repo-side PR labels.

## What Runs Automatically

- `ai-review-grok-super.yml`
  - reviews every same-repo PR update
  - posts one stable review comment as a GitHub Review with inline comments
  - syncs Grok review labels
  - detects CI/CD pipeline changes (CircleCI, GitLab CI, Jenkins, Azure Pipelines, etc.)
- `grok-describe.yml`
  - auto-generates PR description when PR is opened
  - detects PR type (feat/fix/refactor/docs/etc.) from conventional commits
  - generates summary, walkthrough, highlights, and conventional changelog entry
  - adds type labels automatically
  - supports `.grok.toml` configuration
- `pr-manager-grok.yml`
  - keeps PR labels and the PR manager comment in sync
  - classifies docs, automation, dependency, large PRs, and merge-readiness state
  - uses Grok function calling to record the single authoritative PR manager plan
  - strips any legacy `automerge` label still present on older PRs
  - enables `ai-autopilot` automatically on trusted same-repo PRs
  - dispatches `ai-auto-fix` automatically when Grok produced a safe patch on trusted non-protected paths
  - replies to and resolves eligible automation review threads after a newer commit lands and the PR is otherwise clean
  - persists reviewer-objection memory in the manager snapshot so repeated blockers by reviewer/path stay visible across passes
  - folds in prior PR-manager snapshots from the same branch line so repeated blockers/reviewers stay visible across superseding PRs
  - auto-assigns reviewers from CODEOWNERS on PR open (when `auto_assign_reviewers = true` in `.grok.toml`)
  - includes Mermaid state diagram showing PR flow
- `ai-auto-fix-grok.yml`
  - runs only on trusted same-repo PRs when `ai-auto-fix` is applied
  - refuses protected paths
  - validates the patch before pushing
  - adds `ai-fix-applied` after a successful push
  - reports through labels, checks, and artifacts instead of another PR-thread status comment
- `grok-ci-surgeon.yml`
  - listens for failed `CI` / `E2E` workflow runs on trusted same-repo PRs
  - retries failed jobs once before surgery
  - ingests failing job logs
  - asks Grok for a bounded repair patch
  - validates before pushing a fix back to the PR branch
  - reports through workflow checks and artifacts instead of another PR-thread status comment
- `grok-pr-commands.yml`
  - listens for `@grok` commands on PR comments
  - supports `@grok status`, `@grok summarize`, `@grok full-review`, `@grok plan`, `@grok why-not-merge-ready`, `@grok what-changed-since-review`, `@grok assign`, `@grok fix`, `@grok retry`, `@grok resolve`, `@grok autopilot on`, `@grok autopilot off`, and `@grok ask <question>`
  - refreshes the PR manager, explains current readiness, requests reviewers from `CODEOWNERS`, or dispatches safe actions without introducing merge authority
  - `@grok explain <thread-id-or-file>` and `@grok resolve <thread-id-or-file>` can target specific review-thread context
  - `@grok ask <question>` provides interactive Q&A about the PR with conversation context
- `grok-ask.yml`
  - triggered by `@grok ask` command for interactive chat about the PR
  - maintains conversation context across multiple questions
  - loads full PR diff and context for contextual answers
  - posts answers as PR comments with conversation tracking
- `grok-analytics.yml`
  - weekly PR statistics dashboard (runs every Monday at 9am UTC)
  - collects PR metrics: total, merged, open, closed
  - calculates avg review time, avg merge time
  - shows PR size distribution, type distribution
  - tracks top contributors and reviewers
  - posts analytics as an issue with `grok-analytics` label
- `pr-manager-self-test.yml`
  - runs on PRs that change PR automation files
  - verifies the control-plane scripts, formatting, and PR-manager unit tests
  - must pass before automation-changing PRs can reach `merge-ready`
- `danger.yml`
  - keeps the existing `Danger PR Checks` status context
  - no longer posts PR-thread guidance
  - emits quiet check warnings for missing description, huge PRs, and code-without-tests metadata

## Managed Labels

- `ai-auto-fix`
- `ai-fix-applied`
- `ai-autopilot`
- `has-patch`
- `needs-review`
- `security-issue`
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
2. Grok review runs automatically and Grok describe generates the PR description.
3. The PR manager keeps one current state label on the PR: `merge-ready`, `blocked-ci`, `blocked-review`, or `blocked-author`.
4. On trusted same-repo PRs, `ai-autopilot` is kept on automatically so CI surgeon can repair bounded CI failures.
5. If Grok review produced a safe patch on a trusted non-protected PR, the PR manager can dispatch `ai-auto-fix`.
6. You can use `@grok` commands on the PR for interactive operations instead of juggling multiple bot apps.
7. Use `@grok ask <question>` for free-form Q&A about the PR - Grok maintains conversation context.
8. Review threads, pending checks, failing checks, commit statuses, and stale approvals all block `merge-ready`.
9. When the PR reaches `merge-ready`, you do the final review and merge manually.

## Grok Commands

| Command                             | Description                             |
| ----------------------------------- | --------------------------------------- |
| `@grok status`                      | Show current PR merge-readiness status  |
| `@grok summarize`                   | Show PR summary and branch history      |
| `@grok full-review`                 | Show full review with manager state     |
| `@grok plan`                        | Show next steps and blockers            |
| `@grok why-not-merge-ready`         | Explain what's blocking the PR          |
| `@grok what-changed-since-review`   | Show changes since last approval        |
| `@grok assign`                      | Request reviewers from CODEOWNERS       |
| `@grok ask <question>`              | Ask a free-form question about the PR   |
| `@grok explain <file-or-thread>`    | Explain specific file or review thread  |
| `@grok fix`                         | Dispatch auto-fix for the current patch |
| `@grok retry`                       | Retry failed CI/E2E jobs                |
| `@grok resolve <thread-id>`         | Resolve an automation review thread     |
| `@grok autopilot on/off`            | Enable/disable CI autopilot             |
| `@grok explain <thread-id-or-file>` | Explain specific review context         |

## Guardrails

- Auto-fix is disabled for fork PRs.
- Auto-fix and CI surgery refuse workflows, tests, docs, lockfiles, config files, and package manifests.
- Auto-fix runs on labeled `pull_request` events instead of `pull_request_target`.
- Grok review, PR manager, and repair scripts use xAI Responses API with `store: false`.
- PR manager runs in base-branch context on `pull_request_target` and never executes PR code from the head branch.
- Workflow and repo-automation changes must pass `PR Manager Self-Test` before `merge-ready`.
- Human review threads block `merge-ready`.
- Automation review threads only auto-resolve after a newer commit lands and the PR is otherwise clean.
- Merge stays manual. There is no merge bot path or Mergify path in this repo.

## Current Scope Boundary

The PR manager now classifies, dispatches repair lanes, and can clear eligible automation review threads. It still does not auto-resolve ambiguous human judgment calls or broad product/architecture discussions.

The PR thread itself is intentionally narrow:

- one stable Grok code-review comment
- one stable Grok PR-manager comment
- on-demand `@grok` command replies when a command is rejected or needs explanation
