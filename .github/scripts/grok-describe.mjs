#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { buildSearchTools } from './xai-tooling.mjs';

const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const DEFAULT_MAX_DIFF_CHARS = 300_000;
const DESCRIBE_MARKER = '<!-- grok-describe -->';

/**
 * Load .grok.toml config if it exists
 */
function loadConfig() {
  const configPath = '.grok.toml';
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const content = readFileSync(configPath, 'utf8');
    const config = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length) {
        config[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
    return config;
  } catch {
    return {};
  }
}

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
    throw new Error('xAI describe response did not contain valid JSON.');
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
  throw new Error('xAI describe response did not return message content.');
}

function detectPRType(files, diff) {
  const types = new Set();
  const hasTests = files.some(f => f.includes('test') || f.includes('spec') || f.includes('__tests__'));
  const hasDocs = files.some(f => f.startsWith('docs/') || f.endsWith('.md'));
  const hasCI = files.some(f => f.includes('.github/workflows') || f.includes('ci.') || f.includes('.gitlab-ci'));
  const hasConfig = files.some(f => f.includes('config') || f.includes('.json') || f.includes('.yaml') || f.includes('.yml'));
  const hasStyle = files.some(f => f.includes('style') || f.includes('format') || f.includes('prettier') || f.includes('eslint'));
  const isBump = files.some(f => f.includes('package.json') && diff.includes('"version"'));
  const isSecurity = /vulnerability|security|cve-|exploit|injection|xss|csrf/.test(diff.toLowerCase());
  const isPerf = /performance|optimize|faster|efficiency|latency|benchmark/.test(diff.toLowerCase());
  const isBreaking = /breaking|drop|remove|major|deprecated/.test(diff) || diff.includes('throw new Error');

  if (isSecurity) types.add('security');
  if (isBreaking) types.add('breaking');
  if (isBump) types.add('chore');
  if (isPerf && types.size === 0) types.add('perf');
  if (hasCI && types.size === 0) types.add('ci');
  if (hasStyle && types.size === 0) types.add('style');
  if (hasConfig && types.size === 0) types.add('refactor');
  if (hasTests && types.size === 0) types.add('test');
  if (hasDocs && types.size === 0) types.add('docs');
  if (types.size === 0) {
    // Analyze diff for likely type
    const additions = (diff.match(/^\+[^+]/gm) || []).length;
    const deletions = (diff.match(/^-[^-]/gm) || []).length;
    if (additions > deletions * 3) types.add('feat');
    else if (deletions > additions) types.add('refactor');
    else types.add('fix');
  }
  return [...types];
}

async function callXaiDescribe({ title, files, diff, config }) {
  const apiKey = requiredEnv('XAI_API_KEY');
  const model = optionalEnv('XAI_MODEL', DEFAULT_MODEL);
  
  const prTypes = detectPRType(files, diff);
  const includeChangelog = config.include_changelog !== 'false';
  const includeWalkthrough = config.include_walkthrough !== 'false';

  const payload = {
    model,
    store: false,
    temperature: 0.1,
    max_tokens: 4000,
    text: {
      format: {
        type: 'json_schema',
        name: 'grok_pr_describe',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'summary', 'breaking', 'changelog'],
          properties: {
            type: { 
              type: 'string',
              enum: ['feat', 'fix', 'refactor', 'docs', 'style', 'test', 'ci', 'perf', 'security', 'chore', 'breaking', 'release']
            },
            summary: { type: 'string' },
            body: { type: 'string' },
            breaking: { type: 'boolean' },
            needs_testing: { type: 'boolean' },
            changelog: { type: 'string' },
            walkthrough: { type: 'string' },
            highlights: { type: 'array', items: { type: 'string' } },
            todo: { type: 'array', items: { type: 'string' } },
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
          `You are an elite PR description generator for a TypeScript/SvelteKit health dashboard. ` +
          `Generate a concise, informative PR description. ` +
          `PR types: feat (new feature), fix (bug fix), refactor (code change), docs, style, test, ci, perf, security, chore, breaking, release. ` +
          `Focus on WHAT changed and WHY it matters, not HOW. ` +
          `Be specific about health data implications if relevant. ` +
          `Generate a changelog entry in conventional commit format.` +
          (includeWalkthrough ? ` Include a brief walkthrough of the changes.` : ''),
      },
      {
        role: 'user',
        content: [
          `PR Title: ${title}`,
          `PR Types Detected: ${prTypes.join(', ')}`,
          '',
          'Changed Files:',
          files.join('\n') || '(none)',
          '',
          'Unified Diff:',
          diff.slice(0, 150000), // Limit diff size for describe
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
    throw new Error(`xAI describe request failed with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return parseJsonResponse(extractMessageText(data));
}

function renderMarkdown(result, prTypes) {
  const typeEmoji = {
    feat: '✨', fix: '🐛', refactor: '♻️', docs: '📚',
    style: '💄', test: '🧪', ci: '👷', perf: '⚡',
    security: '🔒', chore: '🔧', breaking: '💥', release: '🚀'
  };
  
  const emojis = prTypes.map(t => typeEmoji[t] || '📦').filter(Boolean);
  const typeTags = prTypes.map(t => `\`${t}\``).join(' ' ') || '`change`';

  return `${DESCRIBE_MARKER}
## 🤖 Grok PR Description

${emojis.join(' ')} **Type:** ${typeTags}
${result.breaking ? '\n> ⚠️ **BREAKING CHANGE** - This PR introduces breaking changes!\n' : ''}
### Summary
${result.summary || 'No summary provided.'}

${result.body ? `### Details\n${result.body}\n` : ''}
${result.walkthrough ? `### Walkthrough\n${result.walkthrough}\n` : ''}
${result.highlights?.length ? `### Highlights\n${result.highlights.map(h => `- ${h}`).join('\n')}\n` : ''}
${result.todo?.length ? `### TODO\n${result.todo.map(t => `- [ ] ${t}`).join('\n')}\n` : ''}
${result.needs_testing ? '### ⚠️ Needs Testing\nThis PR may require additional manual testing.\n' : ''}
${result.changelog ? `### Changelog Entry\n\`\`\`\n${result.changelog}\n\`\`\`\n` : ''}
---
*Generated by Grok 4.1 Fast via xAI*
`;
}

async function main() {
  const diffPath = requiredEnv('PR_DIFF_PATH');
  const filesPath = requiredEnv('PR_FILES_PATH');
  const outputJsonPath = requiredEnv('DESCRIBE_JSON_PATH');
  const outputMarkdownPath = requiredEnv('DESCRIBE_MARKDOWN_PATH');

  const title = optionalEnv('PR_TITLE', 'Untitled PR');
  const diff = readFileSync(diffPath, 'utf8').slice(0, DEFAULT_MAX_DIFF_CHARS);
  const files = readFileSync(filesPath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  
  const config = loadConfig();
  const prTypes = detectPRType(files, diff);

  const rawResult = await callXaiDescribe({ title, files, diff, config });
  
  const result = {
    type: rawResult.type || prTypes[0] || 'change',
    types: prTypes,
    summary: rawResult.summary || 'No summary provided.',
    body: rawResult.body || '',
    breaking: Boolean(rawResult.breaking),
    needs_testing: Boolean(rawResult.needs_testing),
    changelog: rawResult.changelog || '',
    walkthrough: rawResult.walkthrough || '',
    highlights: Array.isArray(rawResult.highlights) ? rawResult.highlights : [],
    todo: Array.isArray(rawResult.todo) ? rawResult.todo : [],
  };

  writeFileSync(outputJsonPath, JSON.stringify(result, null, 2));
  writeFileSync(outputMarkdownPath, renderMarkdown(result, prTypes));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
