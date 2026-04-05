#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { buildSearchTools } from './xai-tooling.mjs';

const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const DEFAULT_MAX_DIFF_CHARS = 250_000;
const MAX_LOG_CHARS = 160_000;

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
    throw new Error('xAI CI surgeon response did not contain valid JSON.');
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
  throw new Error('xAI CI surgeon response did not return message content.');
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

function isProtectedPath(file) {
  return (
    file.startsWith('.github/') ||
    file.startsWith('docs/') ||
    file.startsWith('tests/') ||
    [
      '.mergify.yml',
      'package.json',
      'bun.lock',
      'bun.lockb',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'tsconfig.json',
      'svelte.config.js',
      'vite.config.ts',
    ].includes(file)
  );
}

async function callXaiCiSurgeon({ title, changedFiles, diff, failingChecks, logs }) {
  const payload = {
    model: optionalEnv('XAI_MODEL', DEFAULT_MODEL),
    store: false,
    temperature: 0.05,
    max_tokens: 4000,
    text: {
      format: {
        type: 'json_schema',
        name: 'grok_ci_surgeon',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['summary', 'reasoning', 'patch', 'should_attempt_fix'],
          properties: {
            summary: { type: 'string' },
            reasoning: { type: 'string' },
            patch: { type: 'string' },
            should_attempt_fix: { type: 'boolean' },
          },
        },
      },
    },
    tools: buildSearchTools({
      includeCodeInterpreter: true,
      xHandles: ['github', 'xai'],
    }),
    input: [
      {
        role: 'system',
        content:
          'You are an elite CI repair engineer for a TypeScript/SvelteKit repo. ' +
          'Use the failing CI logs, diff, and current docs to generate a minimal patch only when the issue is deterministic and local. ' +
          'If the failure is flaky, external, infra-only, or too risky, set should_attempt_fix=false and return an empty patch.',
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            prTitle: title,
            failingChecks,
            changedFiles,
            diff,
            failingLogs: logs,
          },
          null,
          2
        ),
      },
    ],
  };

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${requiredEnv('XAI_API_KEY')}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`xAI CI surgeon request failed with ${response.status}: ${await response.text()}`);
  }

  return parseJsonResponse(extractMessageText(await response.json()));
}

async function main() {
  const diff = readFileSync(requiredEnv('PR_DIFF_PATH'), 'utf8').slice(0, DEFAULT_MAX_DIFF_CHARS);
  const changedFiles = readFileSync(requiredEnv('PR_FILES_PATH'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const logs = readFileSync(requiredEnv('FAILED_LOGS_PATH'), 'utf8').slice(0, MAX_LOG_CHARS);
  const failingChecks = JSON.parse(readFileSync(requiredEnv('FAILED_CHECKS_PATH'), 'utf8'));

  const raw = await callXaiCiSurgeon({
    title: optionalEnv('PR_TITLE', 'Untitled PR'),
    changedFiles,
    diff,
    failingChecks,
    logs,
  });

  let patch = typeof raw.patch === 'string' ? raw.patch : '';
  const touchedFiles = patch ? parsePatchTouchedFiles(patch) : [];

  if (
    patch &&
    (touchedFiles.length === 0 ||
      touchedFiles.some((file) => !changedFiles.includes(file) || isProtectedPath(file)))
  ) {
    patch = '';
    raw.reasoning =
      'Rejected patch because it touched protected files or files outside the current PR diff.';
    raw.should_attempt_fix = false;
  }

  writeFileSync(
    requiredEnv('SURGEON_JSON_PATH'),
    JSON.stringify(
      {
        summary: typeof raw.summary === 'string' ? raw.summary : 'No summary returned.',
        reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : 'No reasoning returned.',
        should_attempt_fix: Boolean(raw.should_attempt_fix),
        patch,
      },
      null,
      2
    )
  );
  writeFileSync(requiredEnv('SURGEON_PATCH_PATH'), patch);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
