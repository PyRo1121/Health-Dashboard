# AI Code Review Implementation Plan

## Context

The Personal Health Cockpit SvelteKit project has a world-class 2026 CI/CD pipeline with:

- SHA-pinned GitHub Actions (ci.yml, codeql.yml, release.yml, dast.yml)
- SLSA provenance, Trivy scanning, SBOM generation, cosign signing
- CodeQL SAST, OWASP ZAP DAST, Dependabot, CODEOWNERS

**Goal**: Add AI-powered code review layer using existing resources:

- GitHub CLI (gh)
- Minimax AI API key
- OpenAI ChatGPT Pro plan
- GitHub Copilot (if available)

## Research Findings

### Available Tools

| Tool                | GitHub Integration | AI Provider    | Pricing     | Setup       |
| ------------------- | ------------------ | -------------- | ----------- | ----------- |
| GitHub Copilot      | Native reviewer    | GitHub-managed | $10+/mo     | 1 (easiest) |
| CodeRabbit          | GitHub App         | Proprietary    | Free/$24/mo | 2           |
| minimax-code-review | GitHub Action      | MiniMax        | API costs   | 2           |
| reviewdog + LiteLLM | GitHub Action      | Configurable   | OSS + API   | 4           |
| PR-Agent            | GitHub Action      | Configurable   | OSS         | 3           |

### ⚠️ Important Caveat

**ChatGPT Pro ≠ API access**. OpenAI bills ChatGPT Pro and API separately. For automation, you need OpenAI API credits.

## Implementation Steps

### Phase 1: Quick Wins (Same Session)

- [ ] **Install gh-pr-review CLI extension** for terminal-based PR reviews
- [ ] **Create `.github/workflows/ai-review.yml`** for MiniMax code review
- [ ] **Create `.github/workflows/coderabbit.yml`** for CodeRabbit integration
- [ ] **Create `.coderabbit.yaml`** configuration file

### Phase 2: Optional Enhancements (Follow-up)

- [ ] **Configure reviewdog** for custom lint results as PR comments
- [ ] **Set up GitHub Copilot** code review if available
- [ ] **Create OpenAI API fallback** workflow for AI review

### Phase 3: Governance (User Action)

- [ ] **Install CodeRabbit GitHub App** from marketplace
- [ ] **Configure branch protection rules** requiring AI review approval
- [ ] **Set up secret scanning** push protection

## Decisions Required

Before implementation, answer:

1. **GitHub feature availability**:
   - A. GHAS + Copilot available
   - B. Copilot only
   - C. Neither available (use external tools only)

2. **AI review enforcement level**:
   - A. Advisory only (comments, never blocking)
   - B. Advisory + auto-create issues for severe findings
   - C. Blocking check for selected findings

3. **External LLM trigger scope**:
   - A. Every PR
   - B. Only labeled PRs / path conditions
   - C. Manual via workflow dispatch

**Recommended defaults**: 1C, 2A, 3B

## Files to Create/Modify

### Create

- `.github/workflows/ai-review.yml` - MiniMax GitHub Action
- `.github/workflows/coderabbit.yml` - CodeRabbit workflow
- `.coderabbit.yaml` - CodeRabbit configuration

### Modify

- `.github/workflows/ci.yml` - Add AI review job (optional)
- `package.json` - Add review scripts (optional)

## Verification

```bash
# Local validation
gh pr review --help
gh extension list

# After push
gh run list --workflow=ai-review
gh run list --workflow=coderabbit
```

## Blockers

- User needs to add `MINIMAX_API_KEY` to GitHub secrets
- User needs to install CodeRabbit GitHub App if desired
- User needs OpenAI API credits if using OpenAI fallback
