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

/**
 * Detect issue tracker references (Jira, Linear, GitHub Issues)
 */
function detectIssueReferences(title, body) {
  const text = `${title} ${body || ''}`;
  const issues = [];
  
  const patterns = [
    // Jira: PROJECT-123 or PROJECT-1234
    { pattern: /\b([A-Z][A-Z0-9]+-\d+)\b/g, type: 'jira', urlTemplate: (id) => `https://jira.atlassian.com/browse/${id}` },
    // Linear: PROJECT-123 or HEALTH-123
    { pattern: /\b([A-Z]+-\d+)\b/g, type: 'linear', urlTemplate: (id) => `https://linear.app/project/issues/${id}` },
    // GitHub Issues/PRs: #123
    { pattern: /#(\d+)\b/g, type: 'github', urlTemplate: (id) => `#${id}` },
  ];
  
  const seen = new Set();
  
  for (const { pattern, type, urlTemplate } of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const id = match[0];
      if (!seen.has(id)) {
        seen.add(id);
        issues.push({ id, type, url: urlTemplate(id) });
      }
    }
  }
  
  return issues;
}

/**
 * Fetch issue status from Jira (if configured)
 */
async function fetchJiraIssueStatus(issueId, apiToken, email) {
  try {
    const response = await fetch(`https://api.atlassian.com/rest/api/3/issue/${issueId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      status: data.fields?.status?.name || 'Unknown',
      statusCategory: data.fields?.status?.statusCategory?.name || 'Unknown',
      summary: data.fields?.summary || '',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch issue status from Linear (if configured)
 */
async function fetchLinearIssueStatus(issueId, apiKey) {
  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query { issue(id: "${issueId}") { identifier state { name } title } }`,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.data?.issue) {
      return {
        status: data.data.issue.state?.name || 'Unknown',
        summary: data.data.issue.title || '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate dependency changelog from package manager diffs
 */
function generateDependencyChangelog(diff) {
  const lines = diff.split('\n');
  const changes = { added: [], updated: [], removed: [] };
  
  for (const line of lines) {
    // Bun.lock format: @@ -version +version @@
    if (line.startsWith('@@')) {
      continue;
    }
    
    // Detect added dependencies
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const dep = line.slice(1).trim();
      if (dep && !dep.startsWith('-')) {
        // Parse version pattern: "package@^1.2.3" or "package@1.2.3"
        const match = dep.match(/^(@?[\w-]+)@[\^~>=<]+([\d.]+)/);
        if (match) {
          changes.added.push({ name: match[1], version: match[2] });
        }
      }
    }
    
    // Detect removed dependencies  
    if (line.startsWith('-') && !line.startsWith('---')) {
      const dep = line.slice(1).trim();
      if (dep && !dep.startsWith('+')) {
        const match = dep.match(/^(@?[\w-]+)@[\^~>=<]+([\d.]+)/);
        if (match) {
          changes.removed.push({ name: match[1], version: match[2] });
        }
      }
    }
    
    // Detect version updates (look for lines with both old and new)
    if (line.includes('@') && line.includes('->')) {
      const parts = line.split('->').map((part) => part.trim());
      if (parts.length === 2) {
        const oldMatch = parts[0].match(/^(@?[\w-]+)@([\d.]+)/);
        const newMatch = parts[1].match(/^(@?[\w-]+)@([\d.]+)/);
        if (oldMatch && newMatch) {
          changes.updated.push({ 
            name: newMatch[1], 
            from: oldMatch[2], 
            to: newMatch[2] 
          });
        }
      }
    }
  }
  
  return changes;
}

function hasDependencyChanges(files) {
  return files.some(f => 
    f.includes('package.json') || 
    f.includes('bun.lock') || 
    f.includes('package-lock.json') ||
    f.includes('pnpm-lock.yaml') ||
    f.includes('yarn.lock')
  );
}

/**
 * Simple language detection based on character patterns
 */
function detectLanguage(text) {
  if (!text) return 'en';
  
  const patterns = {
    en: /^[a-zA-Z0-9\s.,!?'"(){}:;\-\n]+$/,
    zh: /[\u4e00-\u9fff]/,
    ja: /[\u3040-\u309f\u30a0-\u30ff]/,
    ko: /[\uac00-\ud7af]/,
    ar: /[\u0600-\u06ff]/,
    ru: /[\u0400-\u04ff]/,
    de: /[äöüß]/i,
    fr: /[àâçéèêëïîôùûü]/i,
    es: /[áéíóúüñ¿¡]/i,
    pt: /[ãõçéê]/i,
  };
  
  // Count characters matching each language
  const counts = {};
  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = text.match(new RegExp(pattern, 'g'));
    counts[lang] = matches ? matches.length : 0;
  }
  
  // Find language with most matches
  const detected = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return detected[1] > 0 ? detected[0] : 'en';
}

const languageNames = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  ru: 'Russian',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  pt: 'Portuguese',
};

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

function renderMarkdown(result, prTypes, issues = [], depChanges = null) {
  const typeEmoji = {
    feat: '✨', fix: '🐛', refactor: '♻️', docs: '📚',
    style: '💄', test: '🧪', ci: '👷', perf: '⚡',
    security: '🔒', chore: '🔧', breaking: '💥', release: '🚀'
  };
  
  const emojis = prTypes.map(t => typeEmoji[t] || '📦').filter(Boolean);
  const typeTags = prTypes.map(t => `\`${t}\``).join(' | ') || '`change`';
  
  const issueSection = issues.length > 0
    ? `\n### Related Issues\n${issues.map(issue => {
        const icon = issue.type === 'jira' ? '📋' : issue.type === 'linear' ? '🔷' : '🐙';
        const statusBadge = issue.status ? ` [\`${issue.status}\`] ` : ' ';
        return `- ${icon} **${issue.id}**${statusBadge}${issue.summary ? `- ${issue.summary}` : ''}`;
      }).join('\n')}\n`
    : '';
  
  const depSection = depChanges && (depChanges.added.length > 0 || depChanges.updated.length > 0 || depChanges.removed.length > 0)
    ? `\n### Dependencies\n${depChanges.added.length > 0 ? `\n**Added:**\n${depChanges.added.map(d => `- \`${d.name}@${d.version}\``).join('\n')}\n` : ''}${depChanges.updated.length > 0 ? `\n**Updated:**\n${depChanges.updated.map(d => `- \`${d.name}\`: ${d.from} → ${d.to}`).join('\n')}\n` : ''}${depChanges.removed.length > 0 ? `\n**Removed:**\n${depChanges.removed.map(d => `- ~~\`${d.name}@${d.version}\`~~`).join('\n')}\n` : ''}`
    : '';

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
${result.changelog ? `### Changelog Entry\n\`\`\`\n${result.changelog}\n\`\`\`\n` : ''}${issueSection}${depSection}---
*Generated by Grok 4.1 Fast via xAI*
`;
}

async function main() {
  const diffPath = requiredEnv('PR_DIFF_PATH');
  const filesPath = requiredEnv('PR_FILES_PATH');
  const outputJsonPath = requiredEnv('DESCRIBE_JSON_PATH');
  const outputMarkdownPath = requiredEnv('DESCRIBE_MARKDOWN_PATH');

  const title = optionalEnv('PR_TITLE', 'Untitled PR');
  const prBody = optionalEnv('PR_BODY', '');
  const diff = readFileSync(diffPath, 'utf8').slice(0, DEFAULT_MAX_DIFF_CHARS);
  const files = readFileSync(filesPath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  
  const config = loadConfig();
  const prTypes = detectPRType(files, diff);
  
  // Detect language
  const detectedLang = detectLanguage(`${title} ${prBody}`);
  const preferredLang = config.language || 'en';
  const language = preferredLang !== 'en' ? preferredLang : detectedLang;
  
  // Detect issue references
  const detectedIssues = detectIssueReferences(title, prBody);
  
  // Fetch issue status if configured
  const issues = await Promise.all(detectedIssues.map(async (issue) => {
    if (issue.type === 'jira') {
      const jiraToken = optionalEnv('JIRA_API_TOKEN', '');
      const jiraEmail = optionalEnv('JIRA_EMAIL', '');
      if (jiraToken && jiraEmail) {
        const status = await fetchJiraIssueStatus(issue.id, jiraToken, jiraEmail);
        return status ? { ...issue, ...status } : issue;
      }
    } else if (issue.type === 'linear') {
      const linearKey = optionalEnv('LINEAR_API_KEY', '');
      if (linearKey) {
        const status = await fetchLinearIssueStatus(issue.id, linearKey);
        return status ? { ...issue, ...status } : issue;
      }
    }
    return issue;
  }));

  const rawResult = await callXaiDescribe({ title, files, diff, config });
  
  // Generate dependency changelog if relevant
  const depChanges = hasDependencyChanges(files) ? generateDependencyChangelog(diff) : null;
  
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
    issues,
    dependencies: depChanges,
    language,
    detectedLanguage: detectedLang,
  };

  writeFileSync(outputJsonPath, JSON.stringify(result, null, 2));
  writeFileSync(outputMarkdownPath, renderMarkdown(result, prTypes, issues, depChanges));
  
  console.log(`Detected language: ${languageNames[language] || language}`);
  console.log(`Detected ${issues.length} related issues`);
  if (depChanges) {
    const totalChanges = depChanges.added.length + depChanges.updated.length + depChanges.removed.length;
    console.log(`Detected ${totalChanges} dependency changes`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
