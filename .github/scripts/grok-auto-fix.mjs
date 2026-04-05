#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { buildSearchTools } from './xai-tooling.mjs';

const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const DEFAULT_MAX_DIFF_CHARS = 250_000;
const FORBIDDEN_PREFIXES = ['.github/', 'tests/', 'docs/'];
const FIX_MARKER = '<!-- grok-auto-fix -->';
const FORBIDDEN_FILES = new Set([
  'package.json',
  'bun.lock',
  'bun.lockb',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'svelte.config.js',
  'vite.config.ts',
]);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function parseJsonResponse(content) {
  try {
    return JSON.parse(content);
  } catch {
    const first = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (first >= 0 && last > first) {
      return JSON.parse(content.slice(first, last + 1));
    }
    throw new Error('xAI auto-fix response did not contain valid JSON.');
  }
}

function extractMessageText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    const textPart = item.content.find((part) => part?.type === 'output_text');
    if (typeof textPart?.text === 'string') {
      return textPart.text;
    }
  }

  const choiceContent = payload?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string') {
    return choiceContent;
  }
  if (Array.isArray(choiceContent)) {
    return choiceContent
      .map((item) => {
        if (typeof item?.text === 'string') return item.text;
        if (typeof item?.content === 'string') return item.content;
        return '';
      })
      .join('\n');
  }
  throw new Error('xAI auto-fix completion did not return message content.');
}

function parsePatchTouchedFiles(patch) {
  const touched = new Set();
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++ b/')) {
      touched.add(line.slice('+++ b/'.length).trim());
    }
  }
  return [...touched];
}

function isForbiddenFile(file) {
  return FORBIDDEN_FILES.has(file) || FORBIDDEN_PREFIXES.some((prefix) => file.startsWith(prefix));
}

async function callXaiFix({ title, changedFiles, diff }) {
  const apiKey = requiredEnv('XAI_API_KEY');
  const model = optionalEnv('XAI_MODEL', DEFAULT_MODEL);

  const payload = {
    model,
    store: false,
    temperature: 0.05,
    max_tokens: 3500,
    text: {
      format: {
        type: 'json_schema',
        name: 'grok_pr_fix',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['summary', 'reasoning', 'patch'],
          properties: {
            summary: { type: 'string' },
            reasoning: { type: 'string' },
            patch: { type: 'string' },
          },
        },
      },
    },
    tools: buildSearchTools({
      xHandles: ['github', 'xai'],
    }),
    input: [
      {
        role: 'system',
        content:
          'You are an elite TypeScript/SvelteKit patch generator for a local-first health dashboard. ' +
          'Use web_search and x_search only when current vendor behavior is needed. ' +
          'Return a minimal unified diff patch or an empty string when no safe fix exists. ' +
          'Do not modify workflows, tests, documentation, config files, package manifests, or lockfiles. ' +
          'Do not invent speculative refactors.',
      },
      {
        role: 'user',
        content: [
          `PR Title: ${title}`,
          '',
          'Changed Files:',
          changedFiles.join('\n') || '(none)',
          '',
          'Unified Diff:',
          diff,
        ].join('\n'),
      },
    ],
  };

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`xAI auto-fix request failed with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return parseJsonResponse(extractMessageText(data));
}

async function main() {
  const diffPath = requiredEnv('PR_DIFF_PATH');
  const filesPath = requiredEnv('PR_FILES_PATH');
  const resultJsonPath = requiredEnv('FIX_JSON_PATH');
  const patchPath = requiredEnv('PATCH_PATH');

  const title = optionalEnv('PR_TITLE', 'Untitled PR');
  const diff = readFileSync(diffPath, 'utf8').slice(0, DEFAULT_MAX_DIFF_CHARS);
  const changedFiles = readFileSync(filesPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const changedFileSet = new Set(changedFiles);

  const rawResult = await callXaiFix({ title, changedFiles, diff });
  let patch = typeof rawResult.patch === 'string' ? rawResult.patch : '';
  let reasoning =
    typeof rawResult.reasoning === 'string' ? rawResult.reasoning : 'No reasoning returned.';
  const summary = typeof rawResult.summary === 'string' ? rawResult.summary : 'No summary returned.';

  const touchedFiles = patch ? parsePatchTouchedFiles(patch) : [];

  if (
    patch &&
    (touchedFiles.length === 0 ||
      touchedFiles.some((file) => !changedFileSet.has(file) || isForbiddenFile(file)))
  ) {
    patch = '';
    reasoning =
      'Rejected suggested patch because it touched forbidden paths or files outside the current PR diff.';
  }

  const fixResult = { summary, reasoning, patch, touchedFiles };
  writeFileSync(resultJsonPath, JSON.stringify(fixResult, null, 2));

  // Write markdown comment for pr-manager detection
  const fixMarkdownPath = optionalEnv('FIX_MARKDOWN_PATH', '/tmp/grok-fix.md');
  const patchLines = patch ? patch.split('\n').length : 0;
  const fixMarkdown = `${FIX_MARKER}
## Grok Auto-Fix Result

**Status:** ${patch ? '✅ Patch generated' : '⚠️ No patch (too risky or not applicable)'}
**Summary:** ${summary}
**Reasoning:** ${reasoning}
**Files touched:** ${touchedFiles.length ? touchedFiles.join(', ') : 'none'}
**Patch lines:** ${patchLines}
`;
  writeFileSync(fixMarkdownPath, fixMarkdown);
  writeFileSync(patchPath, patch);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
