#!/usr/bin/env node

import { readFileSync } from 'node:fs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readThreatResult() {
  return JSON.parse(readFileSync(requiredEnv('THREAT_JSON_PATH'), 'utf8'));
}

function collectFixCandidates(result) {
  const findings = Array.isArray(result.findings) ? result.findings : [];
  return findings
    .filter((finding) => {
      const severity = String(finding.severity || '').toLowerCase();
      return (
        ['critical', 'high'].includes(severity) &&
        finding.auto_fix_ready === true &&
        typeof finding.package === 'string' &&
        typeof finding.target_version === 'string' &&
        finding.target_version.trim()
      );
    })
    .map((finding) => ({
      package: finding.package,
      scope: finding.scope || 'dependencies',
      targetVersion: finding.target_version,
      severity: finding.severity,
      advisory: finding.advisory || '',
      whyNow: finding.why_now,
      recommendedAction: finding.recommended_action,
    }));
}

function main() {
  const candidates = collectFixCandidates(readThreatResult());
  process.stdout.write(JSON.stringify(candidates, null, 2));
}

main();
