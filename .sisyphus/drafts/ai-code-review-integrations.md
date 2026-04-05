# Draft: AI Code Review Integrations

## Requirements (confirmed)

- [goal]: Build a comprehensive implementation plan for adding AI-powered code review tools and integrations to this enterprise SvelteKit project.
- [scope]: Cover GitHub-native tools, AI code review tools, local CLI options, workflow integration options, and implementation priority.
- [deliverable]: Return a detailed implementation plan with specific file changes, workflow additions, and step-by-step instructions.
- [language]: Answer in English and write the plan in English.
- [execution mode]: Plan well for ultrawork execution.
- [commit strategy]: Include a clear atomic commit strategy.
- [testing]: Use TDD-oriented planning.

## Technical Decisions

- [planning mode]: Produce a repo-grounded plan only; do not implement integrations.
- [working assumption]: Treat GitHub-native features that depend on licensing as conditional plan branches unless the user confirms availability.

## Research Findings

- [repo-root]: Enterprise SvelteKit repository contains `src/`, `tests/`, Playwright config, multiple Vitest configs, `SECURITY.md`, and existing docs.
- [ci]: `.github/workflows/ci.yml` already runs format, ESLint, `svelte-check`, dependency review, unit tests, component tests, build, and artifact attestation on PR/push.
- [e2e]: `.github/workflows/e2e.yml` runs Playwright separately with artifact upload on failure.
- [security]: `.github/workflows/codeql.yml`, `.github/workflows/dast.yml`, `.github/workflows/release.yml`, and `.zap/rules.yaml` already cover CodeQL, ZAP, SBOM, Trivy, cosign signing, and release attestations.
- [repo-policy]: `.github/dependabot.yml`, `.github/CODEOWNERS`, and `SECURITY.md` are already present.
- [tooling]: Bun is the package manager (`package.json`, `bun.lock`); Husky pre-commit exists at `.husky/pre-commit` and runs `lint-staged`.
- [tests]: TDD-capable infra already exists via `vitest.unit.config.ts`, `vitest.component.config.ts`, `playwright.config.ts`, `scripts/run-vitest.mjs`, and `scripts/test-all.mjs`.
- [existing-pr-automation]: Existing PR automation includes Dependabot and dependency-review PR comments; no reviewdog, Danger, Renovate, or `.pre-commit-config.yaml` were found.
- [app-structure]: SvelteKit app structure is organized under `src/routes`, `src/lib/core`, `src/lib/server`, and `src/lib/features`.
- [ghas-docs]: GHAS is split into GitHub Code Security and GitHub Secret Protection; private/internal repo availability depends on paid Team/Enterprise licensing.
- [codeql-docs]: Best first enhancement is advanced CodeQL setup with `security-extended`; `security-and-quality` is noisier and should follow only after triage capacity is proven.
- [dependabot-docs]: Dependabot security updates can be customized with groups, labels, assignees, commit prefixes, and security-only behavior.
- [coderabbit-docs]: CodeRabbit is best fit for active AI PR review comments; repo-owner/org-owner install is required and rollout should start with selected repositories.
- [copilot-docs]: Copilot PR summaries are useful but manual, English-only, and not auto-updated; good as a native additive feature, not a full reviewer replacement.
- [custom-action-docs]: External LLM review workflows should use least-privilege tokens, SHA-pinned actions, environment secrets, and maintainer-triggered execution for secret-bearing jobs.
- [gh-cli-docs]: `gh pr view`, `gh pr diff`, `gh pr checks`, `gh pr review`, and `gh api` are the most reliable CLI primitives; prefer these over community extensions for enterprise automation.

## Open Questions

- [ghas]: Whether GitHub Advanced Security and Copilot-for-PR capabilities are licensed/enabled in the target org/repo.
- [llm-provider]: Whether Minimax and/or OpenAI should be used for blocking checks, advisory comments, or both.
- [risk-tolerance]: Whether AI findings should create blocking status checks or only non-blocking review comments/issues.
- [trigger-scope]: Whether external LLM review should run on every PR, only labeled PRs, or only on-demand via comment/workflow dispatch.
- [issue-handling]: Whether high-confidence AI findings should open GitHub issues automatically or remain in PR review only.

## Scope Boundaries

- INCLUDE: GitHub-native review/security enhancements, third-party AI review tools, custom AI review automation, local CLI review workflows, sequencing, commit strategy.
- EXCLUDE: Actually installing apps, editing production CI/workflow files, or executing provider integrations.
