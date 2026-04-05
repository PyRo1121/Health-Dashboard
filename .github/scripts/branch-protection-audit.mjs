#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${requiredEnv('GITHUB_TOKEN')}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed for ${path}: ${response.status} ${await response.text()}`);
  }

  return await response.json();
}

function loadRequiredChecksFromMergify() {
  const mergify = readFileSync('.mergify.yml', 'utf8');
  const checks = [];

  for (const line of mergify.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('check-success=')) {
      continue;
    }

    const match = trimmed.match(/check-success=(.+?)\s*(?:#.*)?$/);
    if (match?.[1]) {
      checks.push(match[1].trim().replace(/^["']|["']$/g, ''));
    }
  }

  return [...new Set(checks)];
}

async function main() {
  const [owner, repo] = requiredEnv('GITHUB_REPOSITORY').split('/');
  const branch = requiredEnv('AUDIT_BRANCH');
  const outputPath = requiredEnv('BRANCH_AUDIT_MARKDOWN_PATH');
  const requiredChecks = loadRequiredChecksFromMergify();
  let currentContexts = [];
  let liveAuditStatus;

  try {
    const protection = await github(
      `/repos/${owner}/${repo}/branches/${branch}/protection/required_status_checks`
    );
    currentContexts = protection.contexts ?? [];
    liveAuditStatus = 'ok';
  } catch (error) {
    liveAuditStatus = `unavailable: ${error.message}`;
  }

  const missing = requiredChecks.filter((check) => !currentContexts.includes(check));
  const extra = currentContexts.filter((check) => !requiredChecks.includes(check));

  const markdown = [
    '# Branch Protection Audit',
    '',
    `- Branch: \`${branch}\``,
    `- Live audit: ${liveAuditStatus}`,
    '',
    '## Required checks from repo policy',
    ...requiredChecks.map((check) => `- ${check}`),
    '',
    '## Live required checks',
    ...(currentContexts.length ? currentContexts.map((check) => `- ${check}`) : ['- unavailable']),
    '',
    '## Drift',
    ...(missing.length ? missing.map((check) => `- Missing: ${check}`) : ['- No missing checks']),
    ...(extra.length ? extra.map((check) => `- Extra: ${check}`) : ['- No extra checks']),
  ].join('\n');

  writeFileSync(outputPath, markdown);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
