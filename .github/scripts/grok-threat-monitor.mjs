#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSearchTools } from './xai-tooling.mjs';

const DEFAULT_MODEL = 'grok-4-1-fast-reasoning';
const MARKER = '<!-- grok-threat-monitor -->';

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
    throw new Error('xAI threat monitor response did not contain valid JSON.');
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
  throw new Error('xAI threat monitor response did not return message content.');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeVersion(range) {
  return range.replace(/^[~^<>=\s]+/, '').split(' || ')[0]?.trim() || '';
}

function collectDependencies() {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = readFileSync('bun.lock', 'utf8');
  const groups = [
    ['dependencies', manifest.dependencies ?? {}],
    ['devDependencies', manifest.devDependencies ?? {}],
  ];

  return groups.flatMap(([scope, entries]) =>
    Object.entries(entries).map(([name, range]) => {
      const match = lock.match(
        new RegExp(`"${escapeRegExp(name)}": \\["${escapeRegExp(name)}@([^"]+)"`)
      );
      return {
        name,
        scope,
        requestedVersion: String(range),
        resolvedVersion: match?.[1] ?? normalizeVersion(String(range)),
      };
    })
  );
}

function collectWorkflowActions() {
  const workflowsDir = '.github/workflows';
  return readdirSync(workflowsDir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .flatMap((file) => {
      const content = readFileSync(join(workflowsDir, file), 'utf8');
      return [...content.matchAll(/uses:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)@([^\s]+)/g)].map(
        (match) => ({
          action: match[1],
          version: match[2],
          file,
        })
      );
    });
}

async function queryOsv(dependencies) {
  const queries = dependencies
    .filter((dep) => dep.resolvedVersion)
    .map((dep) => ({
      package: { name: dep.name, ecosystem: 'npm' },
      version: dep.resolvedVersion,
    }));

  if (!queries.length) {
    return [];
  }

  const response = await fetch('https://api.osv.dev/v1/querybatch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    throw new Error(`OSV query failed with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return (data.results ?? []).map((result, index) => ({
    dependency: dependencies[index],
    vulnerabilities: result.vulns ?? [],
  }));
}

async function callThreatMonitor({ dependencies, actions, advisoryHits }) {
  const apiKey = requiredEnv('XAI_API_KEY');
  const model = optionalEnv('XAI_MODEL', DEFAULT_MODEL);

  const payload = {
    model,
    store: false,
    temperature: 0.1,
    max_tokens: 4000,
    text: {
      format: {
        type: 'json_schema',
        name: 'grok_threat_monitor',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['summary', 'severity', 'findings'],
          properties: {
            summary: { type: 'string' },
            severity: {
              type: 'string',
              enum: ['none', 'low', 'medium', 'high', 'critical'],
            },
            findings: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'package',
                  'ecosystem',
                  'severity',
                  'why_now',
                  'evidence',
                  'recommended_action',
                ],
                properties: {
                  package: { type: 'string' },
                  ecosystem: { type: 'string' },
                  severity: {
                    type: 'string',
                    enum: ['critical', 'high', 'medium', 'low'],
                  },
                  version: { type: 'string' },
                  advisory: { type: 'string' },
                  why_now: { type: 'string' },
                  evidence: { type: 'string' },
                  recommended_action: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    tools: buildSearchTools({
      includeCodeInterpreter: true,
      xHandles: ['github', 'xai', 'CISAgov'],
    }),
    input: [
      {
        role: 'system',
        content:
          'You are an enterprise dependency and supply-chain threat analyst. ' +
          'Use web_search and x_search to evaluate the current threat context for direct dependencies and GitHub Actions. ' +
          'Prioritize packages with OSV advisories plus high-leverage build/runtime components. ' +
          'Only report actionable current threats, active exploitation, maintainer warnings, or urgent upgrade pressure.',
      },
      {
        role: 'user',
        content: JSON.stringify(
          {
            repository: requiredEnv('GITHUB_REPOSITORY'),
            directDependencies: dependencies,
            workflowActions: actions,
            osvAdvisories: advisoryHits,
            task: 'Produce a threat-monitor summary for the last 30 days with actionable findings only.',
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
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`xAI threat monitor request failed with ${response.status}: ${await response.text()}`);
  }

  return parseJsonResponse(extractMessageText(await response.json()));
}

function renderMarkdown(result) {
  return `${MARKER}
# Grok Threat Monitor

**Overall severity:** ${String(result.severity || 'none').toUpperCase()}

**Summary:** ${result.summary || 'No summary returned.'}

## Findings
${
  Array.isArray(result.findings) && result.findings.length
    ? result.findings
        .map(
          (finding) =>
            `- **${finding.severity.toUpperCase()}** \`${finding.package}\`${finding.version ? ` (${finding.version})` : ''} — ${finding.why_now}\n  Evidence: ${finding.evidence}\n  Action: ${finding.recommended_action}`
        )
        .join('\n')
    : '✅ No actionable threats detected in this run.'
}

---
Generated by Grok threat monitoring with xAI web + X search.`;
}

async function main() {
  const dependencies = collectDependencies();
  const actions = collectWorkflowActions();
  const osvResults = await queryOsv(dependencies);
  const advisoryHits = osvResults
    .filter((item) => item.vulnerabilities.length)
    .map((item) => ({
      dependency: item.dependency,
      advisories: item.vulnerabilities.map((vuln) => ({
        id: vuln.id,
        aliases: vuln.aliases ?? [],
        summary: vuln.summary ?? '',
      })),
    }));

  const result = await callThreatMonitor({ dependencies, actions, advisoryHits });
  const outputJsonPath = requiredEnv('THREAT_JSON_PATH');
  const outputMarkdownPath = requiredEnv('THREAT_MARKDOWN_PATH');
  writeFileSync(outputJsonPath, JSON.stringify(result, null, 2));
  writeFileSync(outputMarkdownPath, renderMarkdown(result));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
