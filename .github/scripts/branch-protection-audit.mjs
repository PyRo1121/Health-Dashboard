#!/usr/bin/env node

import { writeFileSync } from 'node:fs';

const REQUIRED_CHECKS = [
  'AI Code Review',
  'Analyze (javascript-typescript)',
  'Build',
  'Component Tests',
  'Danger PR Checks',
  'Dependency Review',
  'Lint',
  'PR Manager',
  'Reviewdog PR Comments',
  'Type Check',
  'Unit Tests',
  'playwright',
];

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

async function main() {
  const [owner, repo] = requiredEnv('GITHUB_REPOSITORY').split('/');
  const branch = requiredEnv('AUDIT_BRANCH');
  const outputPath = requiredEnv('BRANCH_AUDIT_MARKDOWN_PATH');
  let currentContexts = [];
  let liveAuditStatus = 'not-run';

  try {
    const protection = await github(
      `/repos/${owner}/${repo}/branches/${branch}/protection/required_status_checks`
    );
    currentContexts = protection.contexts ?? [];
    liveAuditStatus = 'ok';
  } catch (error) {
    liveAuditStatus = `unavailable: ${error.message}`;
  }

  const missing = REQUIRED_CHECKS.filter((check) => !currentContexts.includes(check));
  const extra = currentContexts.filter((check) => !REQUIRED_CHECKS.includes(check));

  const markdown = [
    '# Branch Protection Audit',
    '',
    `- Branch: \`${branch}\``,
    `- Live audit: ${liveAuditStatus}`,
    '',
    '## Required checks from repo policy',
    ...REQUIRED_CHECKS.map((check) => `- ${check}`),
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
