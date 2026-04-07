# Grok CI Hardening and Merge Governance

## TL;DR

> **Summary**: The Grok review path is partially working, but the auto-fix and auto-merge paths are not production-safe. The implementation should preserve advisory Grok review, redesign auto-fix behind a trusted maintainer gate, and consolidate merge control behind exact required checks.
> **Deliverables**:
>
> - deterministic regression tests for Grok workflows and merge policy
> - hardened `ai-review-grok-super.yml`
> - trusted-only `ai-auto-fix-grok.yml`
> - single merge controller with exact required checks
> - aligned docs and secret/control documentation
>   **Effort**: Medium
>   **Parallel**: YES - 3 waves
>   **Critical Path**: 1 → 2/3 → 4/5/6 → 7/8/9

## Context

### Original Request

Evaluate the Grok CI implementation and provide a concrete build plan if fixes are needed for `ai-review-grok-super.yml`, `ai-auto-fix-grok.yml`, and `.mergify.yml`, with English output, ultrawork-ready planning, TDD orientation, and atomic commits.

### Interview Summary

- Repository facts were established before planning.
- Current strengths: Grok review exists, xAI integration is wired, CI jobs exist, E2E exists, CodeQL exists, and Mergify is already present.
- Current breakpoints: brittle review JSON handling, broken auto-fix interpolation/output handling, unsafe `pull_request_target` mutation path, incomplete merge checks, overlapping merge controllers, and stale CI/security docs.
- Planning defaults applied: keep Grok review advisory; restrict auto-fix to trusted same-repo contexts only; use Mergify as the sole merge controller; require fresh approval after bot-authored changes.

### Metis Review (gaps addressed)

- Metis agent resolution failed in this environment after repeated attempts; equivalent gap analysis was completed through Oracle review plus explicit self-review.
- Added hard guardrails for trust boundaries, exact-SHA mutation, server-side patch allowlisting, stale-approval invalidation, single merge authority, and deterministic workflow regression coverage.

## Work Objectives

### Core Objective

Make the Grok CI stack safe, testable, and internally consistent without removing the advisory value of AI review.

### Deliverables

- `tests/ci/**` regression coverage for workflow and merge-policy invariants
- workflow-safe structured output handling in `.github/workflows/ai-review-grok-super.yml`
- trusted-only auto-fix flow in `.github/workflows/ai-auto-fix-grok.yml`
- consolidated merge automation in `.mergify.yml` with no overlapping auto-merge controller
- aligned `SECURITY.md`, `README.md`, workflow inventory, and CI audit docs
- documented `XAI_API_KEY`/control expectations for maintainers

### Definition of Done (verifiable conditions with commands)

- `bun run test:unit -- tests/ci/**/*.test.ts`
- `bun run test:unit`
- `bun run check:ci`
- `bun run lint`
- `bun run build`
- `bun run test:e2e`
- `node scripts/generate-workflow-inventory.mjs` produces no unexpected drift after docs refresh

### Must Have

- Grok review remains read-only and advisory.
- Auto-fix only mutates trusted same-repo PR heads after maintainer gating and exact-SHA validation.
- Patch application is allowlisted and never stages unrelated files.
- Merge automation has one owner and exact required-check names.
- TDD flow exists for workflow/config regressions.
- Docs match the actual enforced control plane.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)

- No privileged mutation of fork PR branches.
- No `git add -A` in auto-fix automation.
- No loose `check-success~=...` patterns for final merge gates where exact job names are known.
- No dependence on malformed or unchecked JSON from xAI responses.
- No dual merge authority between Mergify and a second auto-merge workflow.
- No undocumented secret dependency for `XAI_API_KEY`.

## Verification Strategy

> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: TDD with repo-local Vitest regression tests first, then workflow/config changes to green.
- QA policy: Every task includes agent-executed happy-path and failure-path validation.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Parallel Execution Waves

> Target: 5-8 tasks per wave. Shared testing foundations land first so later workflow edits can proceed safely.

Wave 1: foundation + Grok workflow hardening

- 1. CI regression harness
- 2. Harden Grok review workflow
- 3. Redesign Grok auto-fix workflow

Wave 2: CI enforcement + merge governance + supply-chain hardening

- 4. Add CI Config validation entrypoint
- 5. Consolidate merge governance
- 6. Pin actions and normalize permissions

Wave 3: docs and control-plane alignment

- 7. Add CI controls standard and maintainer docs
- 8. Refresh generated workflow inventory
- 9. Correct stale CI audit doc

### Dependency Matrix (full, all tasks)

- 1 blocks 2, 3, 4, 5, 6
- 2 blocks 6, 7, 9
- 3 blocks 5, 6, 7, 9
- 4 blocks 5, 7, 8, 9
- 5 blocks 7, 8, 9
- 6 blocks 7, 8, 9
- 7 depends on 4, 5, 6
- 8 depends on 5, 6
- 9 depends on 2, 3, 5, 6

### Agent Dispatch Summary (wave → task count → categories)

- Wave 1 → 3 tasks → `ci-test`, `workflow`, `security`
- Wave 2 → 3 tasks → `ci`, `merge-governance`, `supply-chain`
- Wave 3 → 3 tasks → `docs`, `ops-docs`, `audit-docs`

## TODOs

> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Build a deterministic CI-config regression harness

  **What to do**: Add a dedicated `tests/ci/` Vitest suite plus shared YAML/config helpers that parse GitHub workflow files and `.mergify.yml`, assert core invariants, and support fixture-based failure cases. Add a small helper/fixture layout that future tasks can extend without shell parsing. Use existing Vitest conventions and keep the harness offline-only.
  **Must NOT do**: Do not call GitHub APIs, do not rely on live Actions execution, and do not hard-code stale workflow names from current docs drift.

  **Recommended Agent Profile**:
  - Category: `ci-test` - Reason: This task is deterministic config-test infrastructure.
  - Skills: `[]` - No external skill is needed; reuse repo-local Vitest patterns.
  - Omitted: `['playwright']` - Browser automation adds no value for YAML/config regression tests.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `vitest.unit.config.ts:1-26` - Existing unit-test configuration, include globs, and coverage thresholds.
  - Pattern: `scripts/run-vitest.mjs:1-26` - Existing Vitest entrypoint used by package scripts.
  - Test: `tests/core/unit/domain/validation.test.ts:1-24` - Minimal deterministic assertion style to mirror.
  - Test: `tests/features/unit/planning/contracts.test.ts:1-79` - Contract-test style for schema/invariant checks.
  - API/Type: `package.json:11-29` - Existing script naming and command conventions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/**/*.test.ts` passes.
  - [ ] The new helpers can parse `.github/workflows/ai-review-grok-super.yml`, `.github/workflows/ai-auto-fix-grok.yml`, `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, `.github/workflows/automerge-on-approval.yml`, and `.mergify.yml` without shelling out.
  - [ ] At least one negative fixture proves the harness fails cleanly on invalid YAML or malformed config content.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Harness passes on committed config fixtures
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/**/*.test.ts`
    Expected: Vitest exits 0 and writes passing output for the new `tests/ci/**` suite
    Evidence: .sisyphus/evidence/task-1-ci-config-harness.txt

  Scenario: Harness rejects invalid workflow fixture
    Tool: Bash
    Steps: run the targeted negative test added for an intentionally malformed fixture, e.g. `bun run test:unit -- tests/ci/invalid-config.test.ts`
    Expected: the negative-path assertion passes by proving the parser/helper surfaces a deterministic error message
    Evidence: .sisyphus/evidence/task-1-ci-config-harness-error.txt
  ```

  **Commit**: YES | Message: `test(ci): add workflow regression harness` | Files: `tests/ci/**`, optional helper under `tests/support/**`, `package.json` only if required for test ergonomics

- [ ] 2. Harden `ai-review-grok-super.yml` with schema-backed advisory behavior

  **What to do**: Using the Task 1 harness, add review-workflow contract tests first, then update `.github/workflows/ai-review-grok-super.yml` so Grok review remains read-only and advisory. Keep the `pull_request` trigger, remove the currently unwired `workflow_dispatch` input path, validate Grok JSON against a strict in-step schema before use, convert malformed/empty model output into a neutral failure-safe comment/status instead of a hard crash, and make the emitted status context stable and exact. Keep labels informational only; do not make Grok merge-blocking.
  **Must NOT do**: Do not add write access beyond PR comments/labels, do not require Grok success for merge, and do not leave raw `JSON.parse(...)` as the only guard.

  **Recommended Agent Profile**:
  - Category: `workflow` - Reason: This task edits a GitHub Actions workflow plus contract tests.
  - Skills: `[]` - Repo-local YAML and Node scripting are sufficient.
  - Omitted: `['cloudflare', 'playwright']` - Unrelated to workflow hardening.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 7, 8, 9 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.github/workflows/ai-review-grok-super.yml:1-176` - Current Grok review workflow.
  - Pattern: `.github/workflows/ai-review-grok-super.yml:47-155` - xAI call, `JSON.parse`, status update, and label handling that need hardening.
  - API/Type: `package.json:64-72` - Existing `zod` dependency is available for strict response validation.
  - Test: `tests/ci/**` from Task 1 - New contract-test harness to extend.
  - External: `https://docs.x.ai/developers/model-capabilities/text/structured-outputs` - Structured output expectations.
  - External: `https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands` - Safe step-output/file handoff patterns.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/grok-review*.test.ts` passes.
  - [ ] The workflow no longer depends on the unused `workflow_dispatch.pr_number` branch.
  - [ ] Malformed or missing Grok JSON produces a deterministic neutral/reporting path instead of an uncaught failure.
  - [ ] The workflow still creates a PR comment and exact status context `Grok 4.1 Fast Super Review` on valid results.
  - [ ] Workflow permissions remain least-privilege for advisory review only.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Valid structured-output path stays advisory
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/grok-review*.test.ts`
    Expected: tests prove the workflow validates structured output, comments on the PR, and emits the exact advisory status context without elevating merge authority
    Evidence: .sisyphus/evidence/task-2-grok-review.txt

  Scenario: Malformed Grok response fails safely
    Tool: Bash
    Steps: run the malformed-response fixture/spec added for the review workflow, e.g. `bun run test:unit -- tests/ci/grok-review-malformed.test.ts`
    Expected: tests prove malformed JSON maps to the neutral failure-safe path instead of crashing the workflow logic
    Evidence: .sisyphus/evidence/task-2-grok-review-error.txt
  ```

  **Commit**: YES | Message: `fix(ci): harden grok review workflow` | Files: `.github/workflows/ai-review-grok-super.yml`, `tests/ci/**`

- [ ] 3. Redesign `ai-auto-fix-grok.yml` for trusted-only mutation

  **What to do**: Under TDD, add contract tests for the auto-fix workflow, then rework `.github/workflows/ai-auto-fix-grok.yml` so label-triggered auto-fix only runs for same-repo PRs, maintainer-triggered labeling, exact `head.sha`, and allowlisted source paths. Fix malformed `${{ }}` interpolation, normalize `actions/github-script` result handling, require `git apply --check` before apply, stage only allowlisted changed files, comment deterministically on success/no-op/rejection, and always remove the `ai-auto-fix` label at the end.
  **Must NOT do**: Do not mutate fork PR branches, do not check out a moving branch ref, do not `git add -A`, and do not allow patches touching `.github/**`, docs, config, lockfiles, or tests.

  **Recommended Agent Profile**:
  - Category: `security` - Reason: This task crosses the main trust boundary for privileged mutation.
  - Skills: `[]` - Repo-local workflow editing and test updates are sufficient.
  - Omitted: `['playwright']` - No UI verification is involved.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5, 7, 8, 9 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml:1-162` - Current auto-fix workflow.
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml:3-24` - `pull_request_target`, permissions, and checkout behavior.
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml:39-146` - xAI output handling, patch application, and reporting logic that need redesign.
  - Pattern: `SECURITY.md:74-86` - Approval reset and required-check expectations to preserve.
  - Test: `tests/ci/**` from Task 1 - Contract harness for trust-boundary assertions.
  - External: `https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/security-hardening-for-github-actions` - `pull_request_target`, token, and script-injection guardrails.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/grok-auto-fix*.test.ts` passes.
  - [ ] The workflow explicitly rejects fork PRs and non-maintainer label events before any write-capable mutation step.
  - [ ] Checkout/apply logic uses `github.event.pull_request.head.sha` or an equivalent exact commit reference, not a moving branch ref.
  - [ ] Patch validation rejects any file outside the `src/**` allowlist before staging or commit.
  - [ ] The workflow never uses `git add -A` and always removes the `ai-auto-fix` label in success and failure paths.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Trusted same-repo label event can reach patch-apply path
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/grok-auto-fix*.test.ts`
    Expected: tests prove a same-repo maintainer-labeled PR uses exact-SHA checkout, validated patch handling, and targeted staging only
    Evidence: .sisyphus/evidence/task-3-grok-auto-fix.txt

  Scenario: Fork PR or forbidden patch is rejected before mutation
    Tool: Bash
    Steps: run the fork/forbidden-path fixture spec added for the workflow, e.g. `bun run test:unit -- tests/ci/grok-auto-fix-rejection.test.ts`
    Expected: tests prove the workflow aborts before mutation and reports a deterministic rejection path
    Evidence: .sisyphus/evidence/task-3-grok-auto-fix-error.txt
  ```

  **Commit**: YES | Message: `fix(ci): redesign grok auto-fix workflow` | Files: `.github/workflows/ai-auto-fix-grok.yml`, `tests/ci/**`

- [ ] 4. Add a first-class `CI Config` validation entrypoint

  **What to do**: Add a dedicated repo entrypoint for workflow/config regression checks, then wire it into `.github/workflows/ci.yml` as an exact-named job `CI Config`. Use the Task 1 harness instead of shell linting so the same assertions run locally and in CI. The job should install dependencies, run only the CI-config suite, and stay read-only.
  **Must NOT do**: Do not hide config validation inside an unrelated job, do not make it depend on network-only tooling, and do not duplicate the same assertions in multiple jobs.

  **Recommended Agent Profile**:
  - Category: `ci` - Reason: This task connects new regression tests to package scripts and the main CI workflow.
  - Skills: `[]` - Existing Bun/Vitest/Actions patterns are sufficient.
  - Omitted: `['playwright']` - Browser execution is not relevant for config validation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5, 7, 8, 9 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.github/workflows/ci.yml:1-182` - Current CI workflow and exact existing job names.
  - Pattern: `package.json:11-29` - Current script conventions and Bun command layout.
  - Pattern: `scripts/run-vitest.mjs:1-26` - Existing script wrapper for targeted Vitest execution.
  - Test: `tests/ci/**` from Task 1 - The suite to expose via a dedicated command and CI job.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:ci-config` passes locally.
  - [ ] `.github/workflows/ci.yml` contains an exact job name `CI Config` that executes the config suite with read-only permissions.
  - [ ] `bun run test:unit -- tests/ci/**/*.test.ts` and `bun run test:ci-config` are functionally aligned (same assertions, no drift).

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Dedicated CI config entrypoint passes locally
    Tool: Bash
    Steps: run `bun run test:ci-config`
    Expected: the targeted config-validation command exits 0 and runs the `tests/ci/**` suite only
    Evidence: .sisyphus/evidence/task-4-ci-config-entrypoint.txt

  Scenario: CI workflow contract proves `CI Config` is required and read-only
    Tool: Bash
    Steps: run the CI-workflow spec added for this task, e.g. `bun run test:unit -- tests/ci/ci-workflow.test.ts`
    Expected: tests prove the new `CI Config` job exists with least-privilege permissions and the expected command
    Evidence: .sisyphus/evidence/task-4-ci-config-entrypoint-error.txt
  ```

  **Commit**: YES | Message: `chore(ci): enforce workflow config validation` | Files: `package.json`, `.github/workflows/ci.yml`, `tests/ci/**`

- [ ] 5. Consolidate merge governance into Mergify only

  **What to do**: Add merge-policy contract tests first, then tighten `.mergify.yml` to one explicit controller. Remove Grok as a merge prerequisite, require exact named workflow checks `CI`, `E2E`, and `CodeQL`, require at least one fresh human approval plus `automerge`, and remove the overlapping `.github/workflows/automerge-on-approval.yml`. The CI standards doc created later must clarify that `CI` itself contains `CI Config`, `Lint`, `Type Check`, `Dependency Review`, `Unit Tests`, `Component Tests`, and `Build`. Also remove the broken `code-owners` review-request rule and drop the malformed custom squash-message template in favor of a safe default.
  **Must NOT do**: Do not leave fuzzy `check-success~=` patterns for final merge gates, do not keep two merge controllers active, and do not keep Grok review as a required merge condition.

  **Recommended Agent Profile**:
  - Category: `merge-governance` - Reason: This task controls policy, required checks, and merge authority.
  - Skills: `[]` - No external skill is required beyond editing config and tests.
  - Omitted: `['playwright']` - Not relevant for merge-rule validation.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7, 8, 9 | Blocked By: 3, 4

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.mergify.yml:1-56` - Current merge rules, fuzzy checks, malformed template, and `code-owners` rule.
  - Pattern: `.github/workflows/automerge-on-approval.yml:1-82` - Overlapping native auto-merge controller to remove.
  - Pattern: `.github/workflows/ci.yml:1-182` - `CI` workflow that should remain the aggregate required quality gate.
  - Pattern: `.github/workflows/e2e.yml:1-51` - `E2E` workflow required separately from `CI`.
  - Pattern: `.github/workflows/codeql.yml:1-58` - `CodeQL` workflow required separately from `CI`.
  - Pattern: `SECURITY.md:70-86` - Branch-protection posture to align with.
  - Test: `tests/ci/**` from Task 1 - Contract harness for merge-policy assertions.
  - External: `https://docs.mergify.com/configuration/conditions/` - Exact condition syntax.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/merge-governance*.test.ts` passes.
  - [ ] `.github/workflows/automerge-on-approval.yml` is removed.
  - [ ] `.mergify.yml` uses exact named checks `CI`, `E2E`, and `CodeQL` rather than fuzzy `~=` matching for merge gating.
  - [ ] `.mergify.yml` requires at least one human approval and the `automerge` label, with Grok no longer required for merge.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Single merge controller requires exact checks
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/merge-governance*.test.ts`
    Expected: tests prove only Mergify controls merge and that exact required workflow checks are `CI`, `E2E`, and `CodeQL`
    Evidence: .sisyphus/evidence/task-5-merge-governance.txt

  Scenario: Fuzzy-check or duplicate-controller config is rejected
    Tool: Bash
    Steps: run the negative merge-governance spec added for this task, e.g. `bun run test:unit -- tests/ci/merge-governance-negative.test.ts`
    Expected: tests prove fuzzy `~=` checks or a surviving native auto-merge workflow fail the regression suite
    Evidence: .sisyphus/evidence/task-5-merge-governance-error.txt
  ```

  **Commit**: YES | Message: `fix(ci): consolidate merge governance` | Files: `.mergify.yml`, `.github/workflows/automerge-on-approval.yml`, `tests/ci/**`

- [ ] 6. Pin touched external actions and normalize permissions in Grok-related workflows

  **What to do**: Add workflow assertions first, then pin all third-party `uses:` entries in the touched Grok/CI workflows to full commit SHAs and normalize `permissions:` blocks to least privilege at workflow or job scope. Apply this to `.github/workflows/ai-review-grok-super.yml`, `.github/workflows/ai-auto-fix-grok.yml`, and `.github/workflows/ci.yml` if Task 4 added new steps. Keep permission deltas explicit and documented in comments only when the permission is non-obvious.
  **Must NOT do**: Do not leave modified workflows on mutable major tags, do not broaden permissions for convenience, and do not pin unrelated workflows outside the files changed by this plan.

  **Recommended Agent Profile**:
  - Category: `supply-chain` - Reason: This task is about action immutability and least-privilege workflow security.
  - Skills: `[]` - Repo-local YAML editing plus regression tests are sufficient.
  - Omitted: `['cloudflare', 'playwright']` - Not relevant to action pinning.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7, 8, 9 | Blocked By: 2, 3, 4

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.github/workflows/ai-review-grok-super.yml:17-31,124-176` - Current permissions and mutable action refs.
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml:7-24,39-162` - Current permissions and mutable action refs.
  - Pattern: `.github/workflows/ci.yml:15-182` - Existing least-privilege job pattern to preserve when adding `CI Config`.
  - External: `https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/security-hardening-for-github-actions` - Action pinning and least-privilege guidance.
  - Test: `tests/ci/**` from Task 1 - Add assertions for immutable `uses:` refs and required permission scopes.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/workflow-hardening*.test.ts` passes.
  - [ ] Every modified `uses:` reference in the touched workflows is pinned to a full commit SHA.
  - [ ] Every touched workflow/job has an explicit least-privilege `permissions:` declaration consistent with its responsibilities.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Modified workflows are pinned and least-privilege
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/workflow-hardening*.test.ts`
    Expected: tests prove all modified workflows use immutable action refs and explicit minimal permissions
    Evidence: .sisyphus/evidence/task-6-workflow-hardening.txt

  Scenario: Mutable tag or broadened permission is rejected
    Tool: Bash
    Steps: run the negative workflow-hardening spec for mutable refs/permissions, e.g. `bun run test:unit -- tests/ci/workflow-hardening-negative.test.ts`
    Expected: tests prove tag-based `uses:` refs or unexpected write scopes fail the suite
    Evidence: .sisyphus/evidence/task-6-workflow-hardening-error.txt
  ```

  **Commit**: YES | Message: `chore(ci): pin touched actions and normalize permissions` | Files: touched workflow YAML files, `tests/ci/**`

- [ ] 7. Create a CI controls standard and align maintainer-facing docs

  **What to do**: Add `docs/ops/ci-cd-standards.md` as the new control-plane source of truth, then update `SECURITY.md` and `README.md` to reference it. Document the exact required checks, Grok review’s advisory-only role, the trusted-only `ai-auto-fix` operating model, the single Mergify merge authority, and the required `XAI_API_KEY` secret/setup expectations for maintainers. Add a deterministic doc regression test that checks required-check names and secret/setup references stay aligned.
  **Must NOT do**: Do not leave required checks duplicated with conflicting names across docs, do not document Grok as a merge requirement, and do not leave `XAI_API_KEY` undocumented.

  **Recommended Agent Profile**:
  - Category: `docs` - Reason: This task aligns repo policy documents to the new enforced workflow behavior.
  - Skills: `[]` - Standard repo-local Markdown and regression-test work only.
  - Omitted: `['playwright']` - No UI interaction is required.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 4, 5, 6

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `SECURITY.md:23-86` - Current security requirements and recommended branch-protection section.
  - Pattern: `README.md:42-74` - Current environment and CI expectations that need alignment.
  - Pattern: `.mergify.yml` after Task 5 - Exact merge rules that docs must describe.
  - Pattern: `.github/workflows/ai-review-grok-super.yml` after Task 2 - Advisory Grok review behavior docs must match.
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml` after Task 3 - Trusted-only auto-fix behavior docs must match.
  - Test: `tests/ci/**` - Extend with doc drift assertions for required checks and secret docs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/docs-policy*.test.ts` passes.
  - [ ] `docs/ops/ci-cd-standards.md` exists and lists the exact required checks, merge authority, and Grok/auto-fix trust boundaries.
  - [ ] `SECURITY.md` and `README.md` reference the new standard and no longer contradict the enforced workflow behavior.
  - [ ] The maintainer setup docs explicitly mention `XAI_API_KEY`.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Policy docs align with enforced workflow behavior
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/docs-policy*.test.ts`
    Expected: tests prove the standards doc, README, and SECURITY all reflect the same required checks and trust-boundary rules
    Evidence: .sisyphus/evidence/task-7-docs-policy.txt

  Scenario: Missing secret/setup or stale required-check names are rejected
    Tool: Bash
    Steps: run the negative docs-policy spec added for stale/missing references, e.g. `bun run test:unit -- tests/ci/docs-policy-negative.test.ts`
    Expected: tests prove omitted `XAI_API_KEY` docs or stale check names fail the suite
    Evidence: .sisyphus/evidence/task-7-docs-policy-error.txt
  ```

  **Commit**: YES | Message: `docs(ci): align controls inventory and secret docs` | Files: `docs/ops/ci-cd-standards.md`, `SECURITY.md`, `README.md`, `tests/ci/**`

- [ ] 8. Refresh the generated workflow inventory for the Grok workflows

  **What to do**: Regenerate `docs/ops/ci-workflow-inventory.md` using `scripts/generate-workflow-inventory.mjs`, confirm it now lists `ai-review-grok-super.yml` and `ai-auto-fix-grok.yml`, and add a regression assertion that the generated inventory references the current workflow filenames instead of the stale `ai-review.yml` / `ai-fix.yml` names.
  **Must NOT do**: Do not hand-edit generated sections without updating the generator path, and do not leave stale workflow filenames in the committed inventory.

  **Recommended Agent Profile**:
  - Category: `docs` - Reason: This task is generated documentation maintenance plus drift-proofing.
  - Skills: `[]` - No special skill is required.
  - Omitted: `['playwright']` - Not relevant.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 5, 6

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `docs/ops/ci-workflow-inventory.md:1-32` - Current stale generated inventory.
  - Pattern: `scripts/generate-workflow-inventory.mjs` - Generator responsible for this file.
  - Pattern: `.github/workflows/ai-review-grok-super.yml:1-6` - Current Grok review workflow filename/trigger.
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml:1-5` - Current Grok auto-fix workflow filename/trigger.
  - Test: `tests/ci/**` - Extend with generated-doc drift checks.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/generate-workflow-inventory.mjs` produces the committed inventory with no diff.
  - [ ] `bun run test:unit -- tests/ci/workflow-inventory*.test.ts` passes.
  - [ ] `docs/ops/ci-workflow-inventory.md` references `ai-review-grok-super.yml` and `ai-auto-fix-grok.yml` and no longer references `ai-review.yml` or `ai-fix.yml`.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Inventory generation is clean and current
    Tool: Bash
    Steps: run `node scripts/generate-workflow-inventory.mjs` and then `git diff --exit-code docs/ops/ci-workflow-inventory.md`
    Expected: generator exits 0 and produces no diff after the refreshed inventory is committed
    Evidence: .sisyphus/evidence/task-8-workflow-inventory.txt

  Scenario: Stale Grok workflow names are rejected
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/workflow-inventory*.test.ts`
    Expected: tests prove stale `ai-review.yml` / `ai-fix.yml` references fail the drift checks
    Evidence: .sisyphus/evidence/task-8-workflow-inventory-error.txt
  ```

  **Commit**: YES | Message: `docs(ci): refresh workflow inventory` | Files: `docs/ops/ci-workflow-inventory.md`, `tests/ci/**`

- [ ] 9. Correct the stale CI audit document to match the live control plane

  **What to do**: Update `docs/research/2026-04-05-cicd-enterprise-audit.md` so it references the Grok workflow filenames that actually exist, acknowledges the live CodeQL workflow, and describes the new advisory-review / trusted-auto-fix / single-merge-controller architecture instead of the outdated AI-review/AI-fix assumptions. Add a regression assertion that this audit doc cannot claim missing CodeQL or old AI workflow filenames.
  **Must NOT do**: Do not leave contradictory claims about missing CodeQL or nonexistent AI workflow files, and do not rewrite unrelated release/DAST findings outside the scope needed for accuracy.

  **Recommended Agent Profile**:
  - Category: `docs` - Reason: This task is a scoped research-doc correction tied directly to the changed CI control plane.
  - Skills: `[]` - Standard Markdown editing and regression testing only.
  - Omitted: `['playwright']` - Not relevant.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 2, 3, 5, 6

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `docs/research/2026-04-05-cicd-enterprise-audit.md:17-57` - Current stale references to `ai-review.yml`, `ai-fix.yml`, and missing CodeQL.
  - Pattern: `.github/workflows/codeql.yml` - Live CodeQL workflow confirmed by repository exploration.
  - Pattern: `.github/workflows/ai-review-grok-super.yml` - Live Grok review workflow to reference.
  - Pattern: `.github/workflows/ai-auto-fix-grok.yml` - Live Grok auto-fix workflow to reference.
  - Test: `tests/ci/**` - Extend with audit-doc drift assertions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bun run test:unit -- tests/ci/ci-audit-doc*.test.ts` passes.
  - [ ] `docs/research/2026-04-05-cicd-enterprise-audit.md` no longer references `ai-review.yml`, `ai-fix.yml`, or a missing CodeQL workflow.
  - [ ] The audit doc accurately describes Grok review as advisory and auto-fix as trusted-only.

  **QA Scenarios** (MANDATORY - task incomplete without these):

  ```
  Scenario: Audit doc reflects the live CI control plane
    Tool: Bash
    Steps: run `bun run test:unit -- tests/ci/ci-audit-doc*.test.ts`
    Expected: tests prove the audit doc names the live Grok workflows and recognizes CodeQL as present
    Evidence: .sisyphus/evidence/task-9-ci-audit-doc.txt

  Scenario: Stale audit claims are rejected
    Tool: Bash
    Steps: run the negative audit-doc spec for stale references, e.g. `bun run test:unit -- tests/ci/ci-audit-doc-negative.test.ts`
    Expected: tests prove old workflow names or a “CodeQL missing” claim fail the suite
    Evidence: .sisyphus/evidence/task-9-ci-audit-doc-error.txt
  ```

  **Commit**: YES | Message: `docs(ci): refresh ci audit findings` | Files: `docs/research/2026-04-05-cicd-enterprise-audit.md`, `tests/ci/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy

- Commit 1: `test(ci): add workflow regression harness`
- Commit 2: `fix(ci): harden grok review workflow`
- Commit 3: `fix(ci): redesign grok auto-fix workflow`
- Commit 4: `chore(ci): enforce workflow config validation`
- Commit 5: `fix(ci): consolidate merge governance`
- Commit 6: `chore(ci): pin touched actions and normalize permissions`
- Commit 7: `docs(ci): align controls inventory and secret docs`
- Commit 8: `docs(ci): refresh workflow inventory`
- Commit 9: `docs(ci): refresh ci audit findings`
- Rule: each commit must leave the repository passing the task-specific tests plus `bun run test:unit -- tests/ci/**/*.test.ts`.

## Success Criteria

- Grok review runs deterministically and fails safely on malformed output.
- Auto-fix cannot mutate fork PR branches or unexpected files.
- Merge automation depends on exact named checks aligned with policy docs.
- Workflow/docs drift is covered by automated regression checks.
- The repo has a repeatable CI-config validation path suitable for ultrawork execution.
