#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { buildSearchTools } from './xai-tooling.mjs';

const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const DEFAULT_MAX_DIFF_CHARS = 350_000;
const REVIEW_MARKER = '<!-- grok-super-review -->';

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
    throw new Error('xAI response did not contain valid JSON.');
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
  throw new Error('xAI chat completion did not return message content.');
}

function normalizeIssues(issues) {
  if (!Array.isArray(issues)) return [];
  return issues
    .filter((issue) => issue && typeof issue === 'object')
    .map((issue) => ({
      severity: ['critical', 'high', 'medium', 'low'].includes(issue.severity)
        ? issue.severity
        : 'low',
      file: typeof issue.file === 'string' ? issue.file : 'unknown',
      line: Number.isFinite(issue.line) ? issue.line : 1,
      description: typeof issue.description === 'string' ? issue.description : 'No description.',
      suggestion: typeof issue.suggestion === 'string' ? issue.suggestion : 'No suggestion.',
    }));
}

async function callXaiReview({ title, changedFiles, diff }) {
  const apiKey = requiredEnv('XAI_API_KEY');
  const model = optionalEnv('XAI_MODEL', DEFAULT_MODEL);

  const payload = {
    model,
    store: false,
    temperature: 0.1,
    max_tokens: 3500,
    text: {
      format: {
        type: 'json_schema',
        name: 'grok_pr_review',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['summary', 'issues', 'patch', 'overall_approval'],
          properties: {
            summary: { type: 'string' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['severity', 'file', 'line', 'description', 'suggestion'],
                properties: {
                  severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  file: { type: 'string' },
                  line: { type: 'integer', minimum: 1 },
                  description: { type: 'string' },
                  suggestion: { type: 'string' },
                },
              },
            },
            patch: { type: 'string' },
            overall_approval: {
              type: 'string',
              enum: ['approve', 'request_changes', 'comment_only'],
            },
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
          'You are an elite TypeScript/SvelteKit security, privacy, and CI/CD reviewer for a local-first health dashboard. ' +
          'Review only the supplied PR diff. Use web_search and x_search only when current vendor guidance or incidents matter, ' +
          'and prefer official docs over social chatter. Output strict JSON matching the provided schema. ' +
          'Prioritize correctness, privacy for health data, GitHub Actions security, maintainability, performance, and accessibility. ' +
          'Do not spend issues on pure lint, formatting, or mechanical style noise already enforced by ESLint, Prettier, or existing CI unless it directly causes a correctness, security, or accessibility defect. ' +
          'Only include a patch when the fix is minimal and high-confidence.',
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
    throw new Error(`xAI review request failed with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return parseJsonResponse(extractMessageText(data));
}

function renderMarkdown(result) {
  const issues = normalizeIssues(result.issues);
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
  };

  return `${REVIEW_MARKER}
## Grok 4.1 Fast Super Review

**Verdict:** ${String(result.overall_approval || 'comment_only').toUpperCase()}

**Summary:** ${result.summary || 'No summary returned.'}

### Issues
${
  issues.length
    ? issues
        .map(
          (issue) =>
            `- **${severityEmoji[issue.severity]} ${issue.severity.toUpperCase()}** \`${issue.file}:${issue.line}\` — ${issue.description}\n  **Suggestion:** ${issue.suggestion}`
        )
        .join('\n')
    : '✅ No actionable issues found.'
}

${
  result.patch
    ? `### Auto-Fix Patch Available
The PR manager can dispatch \`ai-auto-fix\` automatically when this patch is safe for a trusted same-repo branch.`
    : '### Auto-Fix Patch Available\nNo high-confidence patch suggested.'
}

---
Reviewed by Grok 4.1 Fast Reasoning via xAI`;
}

async function main() {
  const diffPath = requiredEnv('PR_DIFF_PATH');
  const filesPath = requiredEnv('PR_FILES_PATH');
  const outputJsonPath = requiredEnv('REVIEW_JSON_PATH');
  const outputMarkdownPath = requiredEnv('REVIEW_MARKDOWN_PATH');

  const title = optionalEnv('PR_TITLE', 'Untitled PR');
  const diff = readFileSync(diffPath, 'utf8').slice(0, DEFAULT_MAX_DIFF_CHARS);
  const changedFiles = readFileSync(filesPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const rawResult = await callXaiReview({ title, changedFiles, diff });
  const result = {
    summary: typeof rawResult.summary === 'string' ? rawResult.summary : 'No summary returned.',
    issues: normalizeIssues(rawResult.issues),
    patch: typeof rawResult.patch === 'string' ? rawResult.patch : '',
    overall_approval: ['approve', 'request_changes', 'comment_only'].includes(
      rawResult.overall_approval
    )
      ? rawResult.overall_approval
      : 'comment_only',
  };

  writeFileSync(outputJsonPath, JSON.stringify(result, null, 2));
  writeFileSync(outputMarkdownPath, renderMarkdown(result));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
