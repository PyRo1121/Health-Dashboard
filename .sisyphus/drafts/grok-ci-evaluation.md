# Draft: Grok CI Evaluation

## Requirements (confirmed)

- Evaluate the Grok CI implementation.
- Identify what is working.
- Identify what needs fixing.
- Provide a concrete improvement/build plan if fixes are needed.
- Answer in English.
- Write the plan in English.
- Plan well for ultrawork execution.
- Include a clear atomic commit strategy.
- Use TDD-oriented planning.

## Technical Decisions

- Focus evaluation on the current GitHub Actions and Mergify configuration present in the repository.
- Treat this as a planning request, not an implementation request.

## Research Findings

- Repo contains a broader Grok PR automation stack than described: `.github/workflows/ai-review-grok-super.yml`, `pr-manager-grok.yml`, `ai-auto-fix-grok.yml`, `grok-ci-surgeon.yml`, and `grok-pr-commands.yml`, plus supporting scripts under `.github/scripts/`.
- No `.mergify.yml` or `.mergify` config was found; current docs indicate manual merge rather than merge-bot automation.
- Review, auto-fix, and CI-surgeon scripts use xAI Responses API with JSON schema constraints plus fallback JSON extraction.
- Auto-fix and CI-surgeon are guarded to same-repo/trusted contexts and validate with `bun run check:ci` before pushing fixes.
- Likely implementation gap: PR manager and command flow expect `grok-auto-fix` / `grok-ci-surgeon` comment surfaces, but current test/docs indicate those comments are intentionally absent.
- CI/test dependencies exist: `.github/workflows/ci.yml`, `.github/workflows/e2e.yml`, and `.github/workflows/pr-manager-self-test.yml`.
- External guidance supports narrow `pull_request` triggers, minimal per-job permissions, schema validation, and explicit human gating before any write-capable autofix path.

## Open Questions

- The request describes `.mergify.yml` auto-merge as current state, but repository exploration found no Mergify config and docs say merge is manual. Should the plan target restoring Mergify auto-merge, or align everything around manual merge?
- Whether the missing `grok-auto-fix` / `grok-ci-surgeon` comment surfaces are intentional or should be reinstated for PR-manager thread resolution.
- Whether CI-surgeon should continue to watch only workflows literally named `CI` and `E2E`, or all required checks.

## Scope Boundaries

- INCLUDE: GitHub Actions Grok review workflow, Grok auto-fix workflow, Mergify config, dependent CI/test integration, improvement planning.
- EXCLUDE: Implementing fixes in this session.
