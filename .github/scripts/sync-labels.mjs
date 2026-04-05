#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const LEGACY_LABELS_TO_DELETE = ['automerge', 'grok-reviewed', 'grok-approved'];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function repoParts() {
  const repo = requiredEnv('GITHUB_REPOSITORY');
  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repo}`);
  }
  return { owner, name };
}

async function github(path, init = {}) {
  const token = requiredEnv('GITHUB_TOKEN');
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed for ${path}: ${response.status} ${await response.text()}`);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function listLabels(owner, repo) {
  const labels = [];
  let page = 1;
  while (true) {
    const batch = await github(`/repos/${owner}/${repo}/labels?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }
    labels.push(...batch);
    if (batch.length < 100) {
      break;
    }
    page += 1;
  }
  return labels;
}

async function main() {
  const labelsPath = process.argv[2] || '.github/labels.json';
  const desiredLabels = JSON.parse(readFileSync(labelsPath, 'utf8'));
  const { owner, name } = repoParts();
  const existingLabels = await listLabels(owner, name);
  const byName = new Map(existingLabels.map((label) => [label.name, label]));

  for (const label of desiredLabels) {
    const existing = byName.get(label.name);
    if (!existing) {
      await github(`/repos/${owner}/${name}/labels`, {
        method: 'POST',
        body: JSON.stringify(label),
      });
      continue;
    }

    if (existing.color !== label.color || (existing.description ?? '') !== (label.description ?? '')) {
      await github(`/repos/${owner}/${name}/labels/${encodeURIComponent(label.name)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          new_name: label.name,
          color: label.color,
          description: label.description,
        }),
      });
    }
  }

  for (const legacyLabel of LEGACY_LABELS_TO_DELETE) {
    if (byName.has(legacyLabel) && !desiredLabels.some((label) => label.name === legacyLabel)) {
      await github(`/repos/${owner}/${name}/labels/${encodeURIComponent(legacyLabel)}`, {
        method: 'DELETE',
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
