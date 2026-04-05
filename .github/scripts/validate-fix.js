#!/usr/bin/env bun
import { readFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import { basename } from 'path';

const BLOCKED_PATTERNS = [
  /\.workflow\.yml$/,
  /\.github\/workflows\//,
  /package\.json$/,
  /\.lock$/,
  /vitest\.config\./,
  /playwright\.config\./,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /__snapshots__/,
  /\.svelte$/,
];

const MAX_FILES = 5;
const MAX_LINES_CHANGED = 100;

function validatePatch(patchPath) {
  if (!existsSync(patchPath)) {
    console.log(JSON.stringify({ valid: false, reason: 'Patch file not found' }));
    return { valid: false, reason: 'Patch file not found' };
  }

  const patch = readFileSync(patchPath, 'utf-8');

  const lines = patch.split('\n');
  let filesInPatch = [];

  for (const line of lines) {
    if (line.startsWith('+++ ') || line.startsWith('--- ')) {
      const match = line.match(/^[+|-]{3}\s+(.+)/);
      if (match) {
        const file = match[1].replace(/^b\//, '').replace(/^a\//, '');
        if (!filesInPatch.includes(file)) {
          filesInPatch.push(file);
        }
      }
    }
  }

  for (const file of filesInPatch) {
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(file)) {
        console.log(JSON.stringify({ valid: false, reason: `Blocked file: ${file}` }));
        return { valid: false, reason: `Blocked file: ${file}` };
      }
    }
  }

  if (filesInPatch.length > MAX_FILES) {
    console.log(
      JSON.stringify({
        valid: false,
        reason: `Too many files: ${filesInPatch.length} > ${MAX_FILES}`,
      })
    );
    return { valid: false, reason: `Too many files: ${filesInPatch.length} > ${MAX_FILES}` };
  }

  const additions = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
  if (additions > MAX_LINES_CHANGED) {
    console.log(JSON.stringify({ valid: false, reason: `Too many changes: ${additions} lines` }));
    return { valid: false, reason: `Too many changes: ${additions} lines` };
  }

  console.log(JSON.stringify({ valid: true, filesInPatch, additions }));
  return { valid: true, filesInPatch, additions };
}

async function main() {
  const args = process.argv.slice(2);
  const patchPath = args[0];
  const approvedDir = args[1] || 'approved';

  if (!patchPath) {
    console.error('Usage: validate-fix.js <patch-file> [approved-dir]');
    process.exit(1);
  }

  mkdirSync(approvedDir, { recursive: true });

  const result = validatePatch(patchPath);

  if (result.valid) {
    const approvedPath = join(approvedDir, basename(patchPath));
    cpSync(patchPath, approvedPath);
    console.log(`Copied to: ${approvedPath}`);
  }

  process.exit(result.valid ? 0 : 1);
}

import { join } from 'path';
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
