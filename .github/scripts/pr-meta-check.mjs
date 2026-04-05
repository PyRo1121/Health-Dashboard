#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function buildPrMetaAdvisories({ body = '', additions = 0, deletions = 0, changedFiles = [] }) {
  const advisories = [];
  const trimmedBody = String(body || '').trim();
  const totalChanges = Number(additions || 0) + Number(deletions || 0);
  const files = Array.isArray(changedFiles) ? changedFiles : [];

  if (trimmedBody.length < 10) {
    advisories.push('PR description is empty or too short.');
  }

  if (totalChanges > 500) {
    advisories.push('This PR is very large (>500 changed lines). Consider splitting it.');
  }

  if (Number(additions || 0) > 1000) {
    advisories.push('This PR adds more than 1000 lines. Consider breaking it down.');
  }

  const hasTests = files.some((file) => file.includes('.test.') || file.includes('.spec.'));
  const hasCode = files.some(
    (file) => file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.svelte')
  );

  if (hasCode && !hasTests) {
    advisories.push('PR includes code changes but no test updates.');
  }

  return advisories;
}

async function main() {
  const inputPath = process.env.PR_META_INPUT_PATH;
  const outputPath = process.env.PR_META_OUTPUT_PATH;

  if (!inputPath || !outputPath) {
    throw new Error('Missing PR_META_INPUT_PATH or PR_META_OUTPUT_PATH.');
  }

  const input = JSON.parse(readFileSync(inputPath, 'utf8'));
  const advisories = buildPrMetaAdvisories(input);
  writeFileSync(outputPath, JSON.stringify({ advisories }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
