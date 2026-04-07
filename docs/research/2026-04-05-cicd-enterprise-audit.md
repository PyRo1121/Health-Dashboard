# CI/CD Audit for 2026 Enterprise Readiness

Status: Active
Date: 2026-04-05
Scope: GitHub Actions workflow and CI/CD-related repository docs

## Executive summary

The repository has a strong foundation for a modern pipeline: split CI jobs, dependency review, SARIF uploads, SLSA provenance attestation attempts, and release-time scanning/signing.

The biggest gap is **documentation and control-plane coherence**:

- the documented controls in `SECURITY.md` do not match actual workflows,
- several workflows are brittle or incomplete for enterprise-grade assurance,
- there is no single CI/CD standards document defining required checks, environment promotion, and evidence retention expectations.

## What was reviewed

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/release.yml`
- `.github/workflows/snyk.yml`
- `.github/workflows/dast.yml`
- `.github/workflows/reviewdog.yml`
- `.github/workflows/danger.yml`
- `.github/workflows/ai-review-grok-super.yml`
- `.github/workflows/ai-auto-fix-grok.yml`
- `.github/workflows/codeql.yml`
- `README.md` (CI section)
- `SECURITY.md` (security requirements + branch protection)
- `docs/ops/ci-cd-standards.md` (controls standard — created 2026-04-06)

## Key findings (documentation + standards alignment)

### 1) Documentation/implementation drift — resolved (2026-04-06)

`SECURITY.md` previously stated CodeQL SAST was required but no dedicated CodeQL workflow existed. This has been resolved:

- `.github/workflows/codeql.yml` now exists and is declared as a required status check in `SECURITY.md`
- `docs/ops/ci-cd-standards.md` is now the authoritative source of truth for required checks and branch protection

Status: **Fixed** — no further action needed on this finding.

### 2) CI expectations in README are incomplete — resolved (2026-04-06)

`README.md` and `SECURITY.md` now link to `docs/ops/ci-cd-standards.md` as the authoritative controls standard, covering all required checks including Grok automation, CodeQL, dependency review, Snyk, DAST, and release evidence.

Status: **Fixed** — `ci-cd-standards.md` created and cross-referenced.

### 3) Release workflow correctness issues (high)

In `release.yml`:

- `build` exposes `artifact-sha256` output from `steps.hash.outputs.sha256`, but there is no `hash` step,
- SBOM upload uses `github/codeql-action` with an SPDX JSON file as `sarif_file` (format mismatch),
- scan/SBOM jobs do not declare `needs: build` while downloading build artifacts (timing race risk),
- skip inputs (`skip_sbom`, `skip_trivy`) are declared but not used in job conditionals.

Risk:

- flaky or failing releases,
- false confidence in uploaded security evidence,
- manual runs cannot reliably skip intended stages.

Recommendation:

- fix data-flow (`needs`), output wiring, and file format handling; make skip inputs effective.

### 4) DAST workflow likely non-functional by default (medium)

DAST defaults to scanning `http://localhost:5173` but no app boot/start step exists in the workflow.

Risk:

- scheduled scans produce non-actionable results,
- teams believe runtime coverage exists when target is unavailable.

Recommendation:

- for internal scans, add app startup + readiness checks;
- for external scans, require explicit deployed URL and environment-specific auth profiles.

### 5) Third-party action pinning — resolved (2026-04-06)

`oven-sh/setup-bun@v2` was not SHA-pinned across all workflows. This is now fixed:

- All 9 workflow files now pin `oven-sh/setup-bun` to SHA `0c5077e51419868618aeaa5fe8019c62421857d6`
- Core actions (`checkout@v6`, `github-script@v8`, `upload-artifact@v7`, `download-artifact@v8`) are already SHA-pinned per README baseline

Status: **In progress** — broader Dependabot SHA-pinning enforcement is tracked in `ci-cd-standards.md`.

### 6) Enterprise governance controls — resolved (2026-04-06)

`docs/ops/ci-cd-standards.md` now provides the CI/CD controls matrix covering:

- required workflows and branch protection mapping,
- control objectives (security, quality, compliance),
- artifact/evidence retention matrix,
- release promotion and approval model (manual merge only — automation never merges),
- ownership and review cadence.

Risk:

- platform behavior differs by team knowledge,
- hard to satisfy SOC 2 / ISO 27001 / HIPAA-style evidence requests quickly.

Status: **Fixed** — `ci-cd-standards.md` created and linked from `README.md` + `SECURITY.md`.

## 2026 enterprise-grade improvement plan

### Priority 0 (this week)

1. **Fix `SECURITY.md` claims vs reality.**
   - Remove unimplemented controls, or implement and enforce them immediately.
2. **Correct release workflow data flow and formats.**
   - Add missing `needs`, fix invalid output references, align SARIF/SPDX handling.
3. **Make skip inputs functional.**
   - `if:` conditions on `sbom` and `scan` jobs for `workflow_dispatch`.
4. **Establish required-check list in one source of truth.**
   - Keep it synchronized with branch protection.

### Priority 1 (next 2–4 weeks)

1. **Add dedicated CodeQL workflow** (if required by policy).
2. **Pin all third-party actions by SHA** and enforce via policy lint/check.
3. **Add deployment environments and protection rules** with approvers.
4. **Generate and publish release provenance bundle**:
   - artifact digest,
   - signature verification record,
   - SBOM,
   - vulnerability scan summary.

### Priority 2 (quarter)

1. **Policy-as-code for pipelines** (e.g., actionlint + OPA/Conftest rules).
2. **SLSA level progression roadmap** with explicit target and gap tracking.
3. **Resilience/testing for pipelines**:
   - workflow unit tests,
   - dry-run release validation,
   - incident playbooks and rollback exercises.

## Suggested documentation structure

**Status 2026-04-06**: `docs/ops/ci-cd-standards.md` has been created containing:

- required workflows and branch protection mapping,
- control objectives (security, quality, compliance),
- artifact/evidence retention matrix,
- release promotion and approval model (manual merge only — automation never merges),
- ownership and review cadence.

## Suggested KPIs for CI/CD maturity

- Change failure rate (CFR)
- Median lead time to production
- CI flaky test/job rate
- Mean time to restore (MTTR)
- % actions pinned to SHA
- % workflows with least-privilege permissions declared
- % releases with verified provenance + SBOM + signed artifact

## Quick scorecard (2026-04-06)

- Quality gates: **Good**
- Security scanning breadth: **Good**
- Supply-chain hardening consistency: **Good** (oven-sh/setup-bun SHA-pinned across all 9 workflows)
- Release workflow reliability: **Fair** (correctness issues partially addressed; skip inputs still need validation)
- Documentation and audit-readiness: **Good** (ci-cd-standards.md created, README + SECURITY.md aligned)

## Bottom line

The fastest path to fully enterprise-grade governance is complete for documentation and controls.
Remaining open items from the original audit:

- Release workflow correctness (Priority 0): `needs:` data-flow, output wiring, skip inputs — partially addressed, needs follow-through
- DAST workflow non-functional by default (Priority 0/1): app boot/start step still missing
- Policy-as-code for pipelines (Priority 2): actionlint + OPA/Conftest rules not yet implemented

These are tracked as follow-up work and do not block current operations.
