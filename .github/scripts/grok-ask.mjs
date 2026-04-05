#!/usr/bin/env node
/**
 * grok-ask.mjs - Interactive Q&A for PRs
 * 
 * Handles @grok ask command for free-form questions about the PR.
 * Maintains conversation context across multiple questions.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createXaiResponse, extractMessageText, buildSearchTools, optionalEnv } from './xai-tooling.mjs';

const XAI_MODEL = process.env.XAI_MODEL || 'grok-4-1-fast-reasoning';
const XAI_API_KEY = process.env.XAI_API_KEY;

const PR_NUMBER = process.env.PR_NUMBER;
const PR_TITLE = process.env.PR_TITLE || '';
const PR_BODY = process.env.PR_BODY || '';
const PR_DIFF_PATH = process.env.PR_DIFF_PATH;
const PR_FILES_PATH = process.env.PR_FILES_PATH;
const QUESTION = process.env.ASK_QUESTION || '';
const CONVERSATION_ID = process.env.GROK_CONVERSATION_ID || '';
const PREVIOUS_RESPONSE_ID = process.env.GROK_PREVIOUS_RESPONSE_ID || '';
const OUTPUT_JSON_PATH = process.env.GROK_ASK_JSON_PATH || '/tmp/grok-ask.json';
const OUTPUT_MARKDOWN_PATH = process.env.GROK_ASK_MARKDOWN_PATH || '/tmp/grok-ask.md';

function validateEnv() {
  if (!XAI_API_KEY) {
    throw new Error('Missing XAI_API_KEY environment variable.');
  }
  if (!PR_NUMBER) {
    throw new Error('Missing PR_NUMBER environment variable.');
  }
  if (!QUESTION.trim()) {
    throw new Error('Missing ASK_QUESTION environment variable.');
  }
}

function loadPrDiff() {
  if (!PR_DIFF_PATH) return '';
  try {
    return readFileSync(PR_DIFF_PATH, 'utf8');
  } catch {
    return '';
  }
}

function loadPrFiles() {
  if (!PR_FILES_PATH) return [];
  try {
    return readFileSync(PR_FILES_PATH, 'utf8').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function buildSystemPrompt() {
  return `You are Grok, an expert AI code reviewer and PR assistant.
You are helping a developer understand changes in a pull request.

Your role:
- Answer questions about code changes clearly and concisely
- Explain what code does in plain English
- Highlight potential issues, risks, or improvements
- Suggest better approaches when you see suboptimal code
- Be direct and practical - focus on what matters

Guidelines:
- Use code snippets sparingly - explain concepts, don't just dump code
- Consider security, performance, and maintainability implications
- Reference specific files and line numbers when relevant
- Acknowledge when code is good, not just when it's problematic
- If you're unsure, say so rather than guessing

Current conversation ID: ${CONVERSATION_ID || 'new'}`;
}

function buildUserPrompt({ question, prTitle, prBody, prDiff, prFiles, conversationHistory }) {
  let prompt = `# Question\n\n${question}\n\n`;

  if (conversationHistory && conversationHistory.length > 0) {
    prompt += `## Conversation History\n\n`;
    for (const turn of conversationHistory) {
      prompt += `**Q${turn.num}:** ${turn.question}\n\n**A:** ${turn.answer}\n\n`;
    }
    prompt += `---\n\n`;
  }

  prompt += `## Pull Request\n\n`;
  prompt += `**Title:** ${prTitle}\n\n`;
  
  if (prBody && prBody.trim()) {
    prompt += `**Description:**\n${prBody}\n\n`;
  }

  const files = prFiles || [];
  if (files.length > 0) {
    prompt += `**Changed Files (${files.length}):**\n`;
    for (const file of files.slice(0, 50)) {
      prompt += `- ${file}\n`;
    }
    if (files.length > 50) {
      prompt += `- ... and ${files.length - 50} more files\n`;
    }
    prompt += `\n`;
  }

  const diff = prDiff || '';
  if (diff.trim()) {
    // Include first 8000 chars of diff to stay within context limits
    const truncatedDiff = diff.length > 8000 ? diff.slice(0, 8000) + '\n\n[... diff truncated ...]' : diff;
    prompt += `## Diff\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\`\n`;
  }

  return prompt;
}

async function askGrok({ question, prTitle, prBody, prDiff, prFiles, conversationHistory, previousResponseId }) {
  const tools = buildSearchTools({ includeDocsMcp: true });

  const systemMessage = {
    role: 'system',
    content: buildSystemPrompt(),
  };

  const userMessage = {
    role: 'user',
    content: buildUserPrompt({
      question,
      prTitle,
      prBody,
      prDiff,
      prFiles,
      conversationHistory,
    }),
  };

  const input = [systemMessage, userMessage];

  const response = await createXaiResponse({
    apiKey: XAI_API_KEY,
    model: XAI_MODEL,
    input,
    tools,
    temperature: 0.3,
    maxTokens: 3000,
    previousResponseId: previousResponseId || undefined,
    store: false,
  });

  return response;
}

function formatAnswer(response) {
  const text = extractMessageText(response);
  
  // Format with conversation marker
  const marker = CONVERSATION_ID 
    ? `<!-- grok-ask:${CONVERSATION_ID} -->`
    : '<!-- grok-ask -->';

  const formatted = `${marker}\n\n## 🤖 Grok's Answer\n\n${text}\n\n---\n*Asked via \`@grok ask\` | Conversation: \`${CONVERSATION_ID || 'new'}\`*`;

  return {
    text,
    formatted,
    responseId: response.id || null,
  };
}

async function main() {
  validateEnv();

  const prDiff = loadPrDiff();
  const prFiles = loadPrFiles();

  // Parse conversation history from PR body if it exists
  let conversationHistory = [];
  if (PR_BODY) {
    const historyMatch = PR_BODY.match(/<!-- grok-conversation:([\s\S]*?) -->/);
    if (historyMatch) {
      try {
        conversationHistory = JSON.parse(historyMatch[1]);
      } catch {
        conversationHistory = [];
      }
    }
  }

  const response = await askGrok({
    question: QUESTION,
    prTitle: PR_TITLE,
    prBody: PR_BODY,
    prDiff,
    prFiles,
    conversationHistory,
    previousResponseId: PREVIOUS_RESPONSE_ID,
  });

  const answer = formatAnswer(response);

  // Save output
  writeFileSync(OUTPUT_MARKDOWN_PATH, answer.formatted);
  writeFileSync(OUTPUT_JSON_PATH, JSON.stringify({
    question: QUESTION,
    answer: answer.text,
    responseId: answer.responseId,
    conversationId: CONVERSATION_ID || answer.responseId,
    timestamp: new Date().toISOString(),
  }, null, 2));

  console.log('✅ Grok ask completed');
  console.log(`📝 Question: ${QUESTION.slice(0, 100)}...`);
  console.log(`💬 Response ID: ${answer.responseId}`);
  console.log(`🆔 Conversation ID: ${CONVERSATION_ID || answer.responseId}`);
}

main().catch((error) => {
  console.error('❌ Grok ask failed:', error.message);
  process.exit(1);
});
