#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs';

const MINIMAX_API_URL = 'https://api.minimax.io/v1/chat/completions';

const SYSTEM_PROMPT = `You are an expert code fix generator. Your task is to analyze CI errors and generate minimal, targeted fixes.

RULES:
1. Only modify files directly related to the error
2. Prefer smallest fix possible
3. Do NOT modify: workflow files, test configs, snapshots, package.json, lockfiles
4. Do NOT disable lint rules or tests
5. If root cause is unclear, return empty fix
6. Output unified diff format only

ERROR GROUPING:
Analyze errors and group by root cause. Fix one root cause at a time.

RESPONSE FORMAT:
Return JSON with this structure:
{
  "fixAvailable": true/false,
  "reasoning": "brief explanation",
  "filesChanged": ["file1", "file2"],
  "patch": "unified diff string"
}`;

const USER_PROMPT_TEMPLATE = (errors, context) => `Generate a fix for these CI errors:

ERRORS:
${JSON.stringify(errors, null, 2)}

CONTEXT:
- PR Number: ${context.prNumber}
- Repo contains SvelteKit + TypeScript + Bun

Only provide a fix if you are confident in the root cause.`;

async function callMinimax(messages) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY not set');
  }

  const response = await fetch(MINIMAX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-M2.5',
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Minimax API error: ${response.status} ${text}`);
  }

  return response.json();
}

async function main() {
  const args = process.argv.slice(2);
  let errorsPath, outputPath, auditPath;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--errors' && args[i + 1]) {
      errorsPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--audit' && args[i + 1]) {
      auditPath = args[i + 1];
      i++;
    }
  }

  if (!errorsPath) {
    console.error('Usage: generate-fix.js --errors <path> --output <path> --audit <path>');
    process.exit(1);
  }

  const parsed = JSON.parse(readFileSync(errorsPath, 'utf-8'));
  const errors = parsed.errors || [];

  if (errors.length === 0) {
    console.log(JSON.stringify({ fixAvailable: false, reason: 'No errors found' }));
    process.exit(0);
  }

  const prNumber = process.env.PR_NUMBER || 'unknown';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: USER_PROMPT_TEMPLATE(errors, { prNumber }) },
  ];

  let result;
  try {
    const response = await callMinimax(messages);
    const content = response.choices?.[0]?.message?.content || '';

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      parsedContent = { fixAvailable: false, reasoning: 'Failed to parse AI response' };
    }

    result = {
      fixAvailable: parsedContent.fixAvailable || false,
      reasoning: parsedContent.reasoning || '',
      filesChanged: parsedContent.filesChanged || [],
      patch: parsedContent.patch || '',
      model: response.model || 'unknown',
      usage: response.usage || {},
    };
  } catch (err) {
    result = {
      fixAvailable: false,
      reasoning: `API error: ${err.message}`,
      filesChanged: [],
      patch: '',
    };
  }

  if (result.patch && outputPath) {
    writeFileSync(outputPath, result.patch);
  }

  if (auditPath) {
    writeFileSync(
      auditPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          prNumber,
          inputErrors: errors.length,
          result,
        },
        null,
        2
      )
    );
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
