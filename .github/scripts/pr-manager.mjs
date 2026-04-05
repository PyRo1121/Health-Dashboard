#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const MARKER = '<!-- grok-pr-manager -->';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function topLevelArea(file) {
  if (file.startsWith('.github/')) return '.github';
  if (!file.includes('/')) return file;
  return file.split('/')[0];
}

function isDocsFile(file) {
  return (
    file.startsWith('docs/') ||
    file === 'README.md' ||
    file === 'SECURITY.md' ||
    file === 'DESIGN.md' ||
    file.endsWith('.md')
  );
}

function isDependencyFile(file) {
  return (
    file === 'package.json' ||
    file.startsWith('bun.lock') ||
    file === '.github/dependabot.yml' ||
    file === '.github/release-drafter.yml'
  );
}

function isAutomationFile(file) {
  return file.startsWith('.github/') || file === '.mergify.yml';
}

function buildSummary({ prNumber, title, labels, files }) {
  const currentLabels = new Set(labels);
  const docsOnly = files.length > 0 && files.every((file) => isDocsFile(file.filename));
  const dependencyChange =
    files.some((file) => isDependencyFile(file.filename)) ||
    ['dependabot[bot]', 'renovate[bot]'].includes(requiredEnv('PR_AUTHOR'));
  const automationChange = files.some((file) => isAutomationFile(file.filename));
  const largePr = files.length > 20;

  const labelsToAdd = [];
  const labelsToRemove = [];

  const maybeToggle = (name, shouldHave) => {
    if (shouldHave && !currentLabels.has(name)) labelsToAdd.push(name);
    if (!shouldHave && currentLabels.has(name)) labelsToRemove.push(name);
  };

  maybeToggle('docs-only', docsOnly);
  maybeToggle('dependencies', dependencyChange);
  maybeToggle('automation', automationChange);
  maybeToggle('large-pr', largePr);

  const areas = [...new Set(files.map((file) => topLevelArea(file.filename)))].sort();

  const guidance = [
    currentLabels.has('has-patch')
      ? 'Add `ai-auto-fix` to ask Grok to attempt the suggested patch.'
      : 'Grok review runs automatically on PR open/update.',
    currentLabels.has('ai-fix-applied')
      ? 'A Grok auto-fix commit is already on this PR. Re-review before merge.'
      : 'Auto-fix will refuse protected paths such as workflows, tests, docs, configs, and lockfiles.',
    currentLabels.has('automerge')
      ? 'Mergify will merge once required checks and human approval pass.'
      : 'Add `automerge` when you want Mergify to take over after checks and approval.',
    'Use `do-not-merge` or `work-in-progress` to block merge automation immediately.',
  ];

  const markdown = `${MARKER}
## Grok PR Manager

**PR:** #${prNumber} — ${title}

**Changed files:** ${files.length}
**Areas:** ${areas.join(', ') || 'unknown'}

### Managed labels
${[...currentLabels, ...labelsToAdd]
  .filter((label, index, all) => all.indexOf(label) === index)
  .sort()
  .map((label) => `- \`${label}\``)
  .join('\n') || '- none'}

### Automation guidance
${guidance.map((line) => `- ${line}`).join('\n')}

### Notes
- Docs-only PRs get \`docs-only\`.
- Workflow/bot/config PRs get \`automation\`.
- Dependency ecosystem changes get \`dependencies\`.
- PRs touching more than 20 files get \`large-pr\`.
`;

  return {
    labelsToAdd,
    labelsToRemove,
    markdown,
  };
}

function main() {
  const prFiles = readJsonFile(requiredEnv('PR_FILES_PATH'));
  const labels = readJsonFile(requiredEnv('PR_LABELS_PATH'));
  const result = buildSummary({
    prNumber: requiredEnv('PR_NUMBER'),
    title: requiredEnv('PR_TITLE'),
    labels,
    files: prFiles,
  });

  writeFileSync(requiredEnv('PR_MANAGER_JSON_PATH'), JSON.stringify(result, null, 2));
  writeFileSync(requiredEnv('PR_MANAGER_MARKDOWN_PATH'), result.markdown);
}

main();
