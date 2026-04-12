#!/usr/bin/env node
/**
 * grok-walkthrough.mjs - Sequential file-by-file PR walkthrough generator
 * Generates an interactive walkthrough of changed files in logical order
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { buildSearchTools } from './xai-tooling.mjs';

const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const DEFAULT_MAX_DIFF_CHARS = 200_000;
const WALKTHROUGH_MARKER = '<!-- grok-walkthrough -->';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
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
    throw new Error('Invalid JSON response');
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
    if (typeof textPart?.text === 'string') return textPart.text;
  }
  const choiceContent = payload?.choices?.[0]?.message?.content;
  if (typeof choiceContent === 'string') return choiceContent;
  if (Array.isArray(choiceContent)) {
    return choiceContent.map((item) => {
      if (typeof item?.text === 'string') return item.text;
      if (typeof item?.content === 'string') return item.content;
      return '';
    }).join('\n');
  }
  throw new Error('No message content found');
}

function loadCustomInstructions() {
  try {
    const content = readFileSync('.grok.toml', 'utf8');
    const instructions = [];
    let inInstructions = false;
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[custom_instructions]')) {
        inInstructions = true;
        continue;
      }
      if (inInstructions && trimmed.startsWith('[') && !trimmed.startsWith('[custom_instructions]')) {
        break;
      }
      if (inInstructions && trimmed && !trimmed.startsWith('#')) {
        instructions.push(trimmed);
      }
    }
    return instructions.join('\n');
  } catch {
    return '';
  }
}

async function generateFileWalkthrough(files, diff, apiKey, model, customInstructions) {
  const payload = {
    model,
    store: false,
    temperature: 0.2,
    max_tokens: 8000,
    text: {
      format: {
        type: 'json_schema',
        name: 'grok_walkthrough',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['steps', 'summary'],
          properties: {
            summary: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['file', 'description', 'order'],
                properties: {
                  file: { type: 'string' },
                  order: { type: 'integer', minimum: 1 },
                  description: { type: 'string' },
                  importance: { type: 'string', enum: ['high', 'medium', 'low'] },
                  new_concepts: { type: 'array', items: { type: 'string' } },
                  potential_issues: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    tools: buildSearchTools({ xHandles: ['github', 'xai'] }),
    input: [
      {
        role: 'system',
        content:
          `You are an expert code tour guide for a TypeScript/SvelteKit health dashboard. ` +
          `Generate a sequential, educational walkthrough of changed files. ` +
          `Order files in a logical learning path: config/setup first, then core logic, then tests. ` +
          `For each file, explain WHAT changed and WHY in 2-3 sentences. ` +
          `Identify any new concepts introduced and potential issues. ` +
          `Focus on helping reviewers understand the PR's narrative arc. ` +
          (customInstructions ? `\n\nTeam-specific instructions to follow:\n${customInstructions}` : ''),
      },
      {
        role: 'user',
        content: [
          `Changed Files (${files.length}):`,
          files.slice(0, 50).join('\n'),
          files.length > 50 ? `\n... and ${files.length - 50} more files` : '',
          '',
          'Diffs (showing first 200 chars per file):',
          diff.slice(0, DEFAULT_MAX_DIFF_CHARS),
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
    throw new Error(`xAI request failed: ${response.status}`);
  }

  const data = await response.json();
  return parseJsonResponse(extractMessageText(data));
}

function renderWalkthrough(result, totalFiles) {
  const stepEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

  let md = `${WALKTHROUGH_MARKER}
## 🚶 PR Walkthrough

**Files covered:** ${result.steps.length}/${totalFiles} changed files

### Overview
${result.summary}

### Step-by-Step Guide

`;

  for (const step of result.steps.sort((a, b) => a.order - b.order)) {
    const emoji = stepEmoji[step.importance] || '🔵';
    md += `\n#### Step ${step.order}: \`${step.file}\` ${emoji}\n`;
    md += `${step.description}\n`;
    if (step.new_concepts?.length) {
      md += `\n**New concepts:** ${step.new_concepts.join(', ')}\n`;
    }
    if (step.potential_issues?.length) {
      md += `\n**⚠️ Watch for:** ${step.potential_issues.join('; ')}\n`;
    }
  }

  md += `\n---
*Guided walkthrough by Grok 4.1 Fast*\n`;

  return md;
}

async function main() {
  const diffPath = requiredEnv('PR_DIFF_PATH');
  const filesPath = requiredEnv('PR_FILES_PATH');
  const outputJsonPath = requiredEnv('WALKTHROUGH_JSON_PATH');
  const outputMarkdownPath = requiredEnv('WALKTHROUGH_MARKDOWN_PATH');

  const title = optionalEnv('PR_TITLE', 'Untitled PR');
  const apiKey = requiredEnv('XAI_API_KEY');
  const model = optionalEnv('XAI_MODEL', DEFAULT_MODEL);

  const diff = readFileSync(diffPath, 'utf8');
  const files = readFileSync(filesPath, 'utf8').split('\n').filter(Boolean);
  const customInstructions = loadCustomInstructions();

  console.log(`Generating walkthrough for ${files.length} files...`);

  const result = await generateFileWalkthrough(files, diff, apiKey, model, customInstructions);

  const output = {
    title,
    totalFiles: files.length,
    coveredFiles: result.steps.length,
    summary: result.summary,
    steps: result.steps,
  };

  writeFileSync(outputJsonPath, JSON.stringify(output, null, 2));
  writeFileSync(outputMarkdownPath, renderWalkthrough(result, files.length));

  console.log(`✅ Walkthrough: ${result.steps.length} files covered`);
}

main().catch((error) => {
  console.error('❌ Walkthrough failed:', error.message);
  process.exit(1);
});
