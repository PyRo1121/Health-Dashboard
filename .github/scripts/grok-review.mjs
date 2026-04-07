#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
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

const GrokReviewSchema = z.object({
  summary: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      file: z.string(),
      line: z.number().int().positive(),
      endLine: z.number().int().positive().optional(),
      path: z.string().optional(),
      description: z.string(),
      suggestion: z.string(),
    })
  ),
  patch: z.string().optional().default(''),
  overall_approval: z.enum(['approve', 'request_changes', 'comment_only']),
});

function safeParseGrokReview(raw) {
  const result = GrokReviewSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  const fallback = {
    summary: 'Review could not be parsed. Please refer to the raw output.',
    issues: [],
    patch: '',
    overall_approval: 'comment_only',
    _parse_error: result.error.message,
  };
  return fallback;
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

/**
 * Detect CI/CD pipeline systems from changed files
 */
function detectCIPipelines(changedFiles) {
  const ciSystems = [];
  const ciFiles = [];
  
  const ciPatterns = [
    { pattern: /\.circleci\/config\.yml$/, name: 'CircleCI', icon: '⚙️' },
    { pattern: /\.gitlab-ci\.ya?ml$/, name: 'GitLab CI', icon: '🔶' },
    { pattern: /Jenkinsfile(?:\.pipeline)?$/, name: 'Jenkins', icon: '💧' },
    { pattern: /\.github\/workflows\/.+\.ya?ml$/, name: 'GitHub Actions', icon: '🐙' },
    { pattern: /azure-pipelines\.ya?ml$/, name: 'Azure Pipelines', icon: '🔷' },
    { pattern: /bitbucket-pipelines\.ya?ml$/, name: 'Bitbucket Pipelines', icon: '📦' },
    { pattern: /\.travis\.ya?ml$/, name: 'Travis CI', icon: '✅' },
    { pattern: /\.drone\.ya?ml$/, name: 'Drone CI', icon: '🚀' },
    { pattern: /buildkite\/.+\.ya?ml$/, name: 'Buildkite', icon: '🏗️' },
  ];
  
  for (const file of changedFiles) {
    for (const { pattern, name, icon } of ciPatterns) {
      if (pattern.test(file)) {
        if (!ciSystems.includes(name)) {
          ciSystems.push(name);
        }
        ciFiles.push({ file, system: name });
      }
    }
  }
  
  return { ciSystems, ciFiles };
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
      endLine: Number.isFinite(issue.endLine) ? issue.endLine : issue.line,
      path: typeof issue.path === 'string' ? issue.path : issue.file,
      description: typeof issue.description === 'string' ? issue.description : 'No description.',
      suggestion: typeof issue.suggestion === 'string' ? issue.suggestion : 'No suggestion.',
      body: typeof issue.body === 'string' ? issue.body : `${issue.description}\n\n**Suggestion:** ${issue.suggestion}`,
    }));
}

async function callXaiReview({ title, changedFiles, diff }) {
  const apiKey = requiredEnv('XAI_API_KEY');
  const model = optionalEnv('XAI_MODEL', DEFAULT_MODEL);
  
  // Detect CI pipelines
  const { ciSystems, ciFiles } = detectCIPipelines(changedFiles);
  const ciContext = ciSystems.length > 0
    ? `\n\n## CI/CD Pipeline Context\nThis PR modifies CI configuration for: ${ciSystems.join(', ')}\n` +
      `Changed CI files:\n${ciFiles.map(f => `- ${f.file}`).join('\n')}\n` +
      'Pay special attention to CI security (secret exposure, insecure credentials, dangerous commands) and configuration correctness.'
    : '';

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
          'Only include a patch when the fix is minimal and high-confidence.' +
          ciContext,
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

function renderMarkdown(result, ciSystems = []) {
  const issues = normalizeIssues(result.issues);
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
  };
  
  const ciSection = ciSystems.length > 0
    ? `\n### CI/CD Pipelines\nThis PR modifies: ${ciSystems.join(', ')}`
    : '';

  // Group issues by file for inline display
  const issuesByFile = new Map();
  for (const issue of issues) {
    const key = issue.path || issue.file;
    if (!issuesByFile.has(key)) {
      issuesByFile.set(key, []);
    }
    issuesByFile.get(key).push(issue);
  }

  // Generate inline comments with suggestions for GitHub review
  const inlineComments = [];
  const suggestions = [];
  for (const issue of issues) {
    if (issue.path && issue.line) {
      const comment = {
        path: issue.path,
        line: issue.line,
        side: issue.side || 'RIGHT',
        body: `${severityEmoji[issue.severity]} **${issue.severity.toUpperCase()}:** ${issue.body}`,
      };
      
      // If there's a suggestion patch, format it as a GitHub suggestion
      if (issue.suggestion && issue.suggestion !== 'No suggestion.') {
        comment.body += `\n\n\`\`\`suggestion:${issue.line}
${issue.suggestion}
\`\`\``;
        suggestions.push(comment);
      } else {
        inlineComments.push(comment);
      }
    }
  }

  // Write inline comments and suggestions to file for workflow
  const allInlineComments = [...inlineComments, ...suggestions];
  if (allInlineComments.length) {
    writeFileSync('/tmp/inline-comments.json', JSON.stringify(allInlineComments, null, 2));
  }
  
  // Write suggestions separately for GitHub suggestions feature
  if (suggestions.length) {
    writeFileSync('/tmp/code-suggestions.json', JSON.stringify(suggestions, null, 2));
  }

  let fileCommentsSection = '';
  for (const [file, fileIssues] of issuesByFile) {
    fileCommentsSection += `\n#### \`${file}\`\n`;
    for (const issue of fileIssues) {
      fileCommentsSection += `- **${severityEmoji[issue.severity]} ${issue.severity.toUpperCase()}** line ${issue.line}: ${issue.description}\n`;
      fileCommentsSection += `  - **Suggestion:** ${issue.suggestion}\n`;
    }
  }

  return `${REVIEW_MARKER}
## Grok 4.1 Fast Super Review

**Verdict:** ${String(result.overall_approval || 'comment_only').toUpperCase()}

**Summary:** ${result.summary || 'No summary returned.'}

${ciSection}

### Issues${issuesByFile.size > 0 ? fileCommentsSection : '\n- ✅ No actionable issues found.'}

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
  
  // Detect CI pipelines
  const { ciSystems } = detectCIPipelines(changedFiles);

  const rawResult = await callXaiReview({ title, changedFiles, diff });
  const parsed = safeParseGrokReview(rawResult);
  const isFallback = '_parse_error' in parsed;

  const result = {
    summary: parsed.summary,
    issues: normalizeIssues(parsed.issues),
    patch: parsed.patch ?? '',
    overall_approval: parsed.overall_approval,
    ciSystems,
    ...(isFallback ? { _parse_error: parsed._parse_error } : {}),
  };

  writeFileSync(outputJsonPath, JSON.stringify(result, null, 2));
  const markdown = isFallback
    ? `${REVIEW_MARKER}\n## Grok 4.1 Fast Super Review\n\n**Summary:** ${parsed.summary}\n\n---\n*Review powered by Grok 4.1 Fast Reasoning via xAI*`
    : renderMarkdown(result, ciSystems);
  writeFileSync(outputMarkdownPath, markdown);

  if (!isFallback) {
    const issues = normalizeIssues(result.issues);
    const inlineComments = [];
    for (const issue of issues) {
      if (issue.path && issue.line) {
        inlineComments.push({
          path: issue.path,
          line: issue.line,
          side: 'RIGHT',
          body: issue.body,
        });
      }
    }
    writeFileSync('/tmp/inline-comments.json', JSON.stringify(inlineComments, null, 2));
  } else {
    writeFileSync('/tmp/inline-comments.json', JSON.stringify([], null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
