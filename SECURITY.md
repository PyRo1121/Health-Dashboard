# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.1   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### For Critical Vulnerabilities

- Email: [ Report via GitHub Security Advisories ]
- Response time: 24 hours

### For Non-Critical Issues

- Open a GitHub Issue with the `security` label
- Or submit a Pull Request with the fix

## Security Requirements

### CI/CD Pipeline

All changes must pass:

- CodeQL SAST analysis
- Dependency vulnerability scanning
- Type checking with strict mode
- Unit and component tests
- Build process with artifact attestation

### Pre-commit Checks

- ESLint + Prettier formatting
- No new TypeScript errors
- All tests passing locally

### Vulnerability Severity Threshold

- **Critical/High**: Blocks merge, must be fixed immediately
- **Medium**: Blocks merge, fix within 7 days
- **Low**: Advisory, fix within 30 days

### Secrets Management

- Never commit secrets to the repository
- Use GitHub Secrets for CI/CD credentials
- Rotate exposed credentials immediately

### Dependency Updates

- Dependabot enabled for automatic updates
- Weekly review recommended
- Security patches applied within 48 hours

## Security Features Implemented

- [x] SAST scanning (CodeQL)
- [x] Dependency vulnerability scanning (Dependency Review)
- [x] Artifact attestation (SLSA provenance)
- [x] Secret scanning (GitHub Advanced Security)
- [x] Least-privilege GitHub Actions permissions
- [x] Immutable lockfiles
- [x] Branch protection (recommended)

## Recommended Branch Protection

For production deployments, enable these settings:

```
Require pull request reviews before merging: Yes
Required reviewers: 1
Dismiss stale reviews: Yes
Require status checks to pass before merging: Yes
  - CI
  - CodeQL
  - Dependency Review
Require branches to be up to date before merging: Yes
```

## License

This project is private and proprietary. All rights reserved.
