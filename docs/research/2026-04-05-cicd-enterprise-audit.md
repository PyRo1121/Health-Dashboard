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
- `.github/workflows/ai-review.yml`
- `.github/workflows/ai-fix.yml`
- `README.md` (CI section)
- `SECURITY.md` (security requirements + branch protection)

## Key findings (documentation + standards alignment)

### 1) Documentation/implementation drift (high)

`SECURITY.md` states CodeQL SAST is required and lists CodeQL as a required status check, but there is no dedicated CodeQL workflow in `.github/workflows/`.

Risk:

- auditors and engineering teams may assume controls exist when they do not,
- branch protection guidance can become un-actionable due to missing checks.

Recommendation:

- either add a real CodeQL workflow and enforce it, or update `SECURITY.md` to reflect the currently enforced scanning stack.

### 2) CI expectations in README are incomplete (medium)

`README.md` says CI is expected to run typecheck/lint/tests/build, but does not mention dependency review, Snyk, DAST, release signing/attestation, or artifact security evidence.

Risk:

- contributors and platform teams have no concise operational contract,
- new repos/environments cannot reliably reproduce the same policy baseline.

Recommendation:

- add a single CI/CD reference doc and link it from README + SECURITY.

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

### 5) Third-party action pinning inconsistency (medium)

Some actions are pinned by major tag (`@v4`, `@v2`), while others are pinned by commit SHA only in selective places (ZAP full/api), creating mixed supply-chain hardening.

Risk:

- uneven control over upstream action drift.

Recommendation:

- adopt a policy: all external actions pinned to full commit SHA + tracked by Dependabot updates.

### 6) Enterprise governance controls are implicit, not documented (medium)

There is no explicit document for:

- environment promotion gates (dev/stage/prod),
- deployment approvals and change windows,
- rollback drill expectations,
- artifact/SBOM/signature retention SLAs,
- required evidence for audits.

Risk:

- platform behavior differs by team knowledge,
- hard to satisfy SOC 2 / ISO 27001 / HIPAA-style evidence requests quickly.

Recommendation:

- create a CI/CD controls matrix and operating runbook.

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

Create `docs/ops/ci-cd-standards.md` containing:

- required workflows and branch protection mapping,
- control objectives (security, quality, compliance),
- artifact/evidence retention matrix,
- release promotion and approval model,
- incident response and rollback runbook links,
- ownership and review cadence.

## Suggested KPIs for CI/CD maturity

- Change failure rate (CFR)
- Median lead time to production
- CI flaky test/job rate
- Mean time to restore (MTTR)
- % actions pinned to SHA
- % workflows with least-privilege permissions declared
- % releases with verified provenance + SBOM + signed artifact

## Quick scorecard (current)

- Quality gates: **Good**
- Security scanning breadth: **Good**
- Supply-chain hardening consistency: **Fair**
- Release workflow reliability: **Fair**
- Documentation and audit-readiness: **Needs improvement**

## Bottom line

You are close to a strong SMB/startup-grade pipeline, but not yet at fully enterprise-grade documentation and governance.

The fastest path to 2026 enterprise readiness is to: (1) eliminate documentation drift, (2) fix release workflow correctness issues, and (3) formalize CI/CD controls in a single maintained standard.
