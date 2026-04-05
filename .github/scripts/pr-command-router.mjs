#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';

export function parsePrCommand(body = '') {
  const text = String(body).trim();

  function withArgument(kind, pattern) {
    const match = text.match(pattern);
    return match ? { kind, raw: text, argument: (match[1] || '').trim() } : null;
  }

  if (/@grok\s+summarize\b/i.test(text)) {
    return { kind: 'summarize', raw: text };
  }
  if (/@grok\s+full-review\b/i.test(text)) {
    return { kind: 'full-review', raw: text };
  }
  if (/@grok\s+plan\b/i.test(text)) {
    return { kind: 'plan', raw: text };
  }
  if (/@grok\s+why-not-merge-ready\b/i.test(text)) {
    return { kind: 'why-not-merge-ready', raw: text };
  }
  if (/@grok\s+what-changed-since-review\b/i.test(text)) {
    return { kind: 'what-changed-since-review', raw: text };
  }
  if (/@grok\s+assign\b/i.test(text) || /@grok\s+suggest-reviewers\b/i.test(text)) {
    return { kind: 'assign', raw: text };
  }
  const explain = withArgument('explain', /@grok\s+explain(?:\s+(.+))?$/i);
  if (explain) {
    return explain;
  }
  if (/@grok\s+(status|review)\b/i.test(text)) {
    return { kind: 'status', raw: text };
  }
  if (/@grok\s+(fix|autofix)\b/i.test(text)) {
    return { kind: 'fix', raw: text };
  }
  if (/@grok\s+retry\b/i.test(text)) {
    return { kind: 'retry', raw: text };
  }
  const resolve = withArgument('resolve', /@grok\s+resolve(?:\s+(.+))?$/i);
  if (resolve) {
    return resolve;
  }
  if (/@grok\s+autopilot\s+on\b/i.test(text)) {
    return { kind: 'autopilot-on', raw: text };
  }
  if (/@grok\s+autopilot\s+off\b/i.test(text)) {
    return { kind: 'autopilot-off', raw: text };
  }
  const ask = withArgument('ask', /@grok\s+ask(?:\s+(.+))?$/i);
  if (ask) {
    return ask;
  }

  return { kind: 'none', raw: text };
}

async function main() {
  const bodyPath = process.env.PR_COMMAND_BODY_PATH;
  const outputPath = process.env.PR_COMMAND_JSON_PATH;

  if (!bodyPath || !outputPath) {
    throw new Error('Missing PR_COMMAND_BODY_PATH or PR_COMMAND_JSON_PATH.');
  }

  const body = readFileSync(bodyPath, 'utf8');
  const result = parsePrCommand(body);
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
