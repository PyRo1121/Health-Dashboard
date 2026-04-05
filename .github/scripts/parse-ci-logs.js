#!/usr/bin/env bun
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const HUMAN_REVIEW_PATTERNS = [
  /workflow.*\.yml/,
  /\.test\.|spec\./,
  /snapshot/i,
  /package\.json|lockfile/,
  /\.lock$/,
  /^\.github\//,
];

function extractErrorsFromLog(logContent) {
  const errors = [];
  const lines = logContent.split('\n');

  for (const line of lines) {
    const tsMatch = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/);
    if (tsMatch) {
      errors.push({
        file: tsMatch[1],
        line: parseInt(tsMatch[2]),
        column: parseInt(tsMatch[3]),
        severity: tsMatch[4],
        source: tsMatch[5],
        message: tsMatch[6],
      });
      continue;
    }

    const eslintMatch = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning)\s+(@[\w/-]+\s+)?(.+)$/);
    if (eslintMatch) {
      errors.push({
        file: eslintMatch[1],
        line: parseInt(eslintMatch[2]),
        column: parseInt(eslintMatch[3]),
        severity: eslintMatch[4],
        message: eslintMatch[6],
        source: 'ESLint',
      });
      continue;
    }

    const genericMatch = line.match(/^(.+?):(\d+):(\d+):\s*(error|warning)\s*(.*)$/);
    if (genericMatch && !errors.some((e) => e.message === genericMatch[5])) {
      errors.push({
        file: genericMatch[1],
        line: parseInt(genericMatch[2]),
        column: parseInt(genericMatch[3]),
        severity: genericMatch[4],
        message: genericMatch[5] || line,
        source: 'Unknown',
      });
    }
  }

  const unique = new Map();
  for (const err of errors) {
    const key = `${err.file}:${err.line}:${err.message}`;
    if (!unique.has(key)) {
      unique.set(key, err);
    }
  }

  return Array.from(unique.values());
}

function checkNeedsHumanReview(errors) {
  return errors.some((err) => {
    if (!err.file) return false;

    for (const pattern of HUMAN_REVIEW_PATTERNS) {
      if (pattern.test(err.file)) {
        return true;
      }
    }

    if (errors.length > 10) return true;

    return false;
  });
}

function groupErrorsByFile(errors) {
  const groups = new Map();

  for (const err of errors) {
    if (!err.file) continue;

    const baseFile = basename(err.file);

    if (!groups.has(baseFile)) {
      groups.set(baseFile, []);
    }
    groups.get(baseFile).push(err);
  }

  return Array.from(groups.entries()).map(([file, fileErrors], index) => {
    const errorType =
      fileErrors[0]?.source ||
      (file.endsWith('.ts') ? 'TypeScript' : file.endsWith('.svelte') ? 'Svelte' : 'General');

    return {
      id: `group-${index + 1}`,
      primaryFile: fileErrors[0]?.file || file,
      relatedFiles: [...new Set(fileErrors.map((e) => e.file).filter(Boolean))],
      errorCount: fileErrors.length,
      errorType,
      sampleErrors: fileErrors.slice(0, 3).map((e) => `${e.message} (line ${e.line})`),
    };
  });
}

async function main() {
  const logDir = process.argv[2] || 'logs';
  const outputFile = process.argv[3] || 'parsed.json';

  let logContent = '';

  try {
    const files = readdirSync(logDir);

    for (const file of files) {
      const filePath = join(logDir, file);
      const stat = statSync(filePath);

      if (stat.isFile() && !file.startsWith('.')) {
        const content = readFileSync(filePath, 'utf-8');
        logContent += `\n=== ${file} ===\n${content}`;
      }
    }
  } catch {
    logContent = readFileSync(0, 'utf-8');
  }

  const errors = extractErrorsFromLog(logContent);
  const needsHumanReview = checkNeedsHumanReview(errors);
  const groups = groupErrorsByFile(errors);

  const result = {
    errorCount: errors.length,
    errors,
    groups,
    needsHumanReview,
    rawLog: logContent.slice(0, 10000),
  };

  console.log(JSON.stringify(result, null, 2));

  if (outputFile && outputFile !== '-') {
    const { writeFileSync } = await import('fs');
    writeFileSync(outputFile, JSON.stringify(result, null, 2));
  }
}

main().catch(console.error);
