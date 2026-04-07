import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'yaml';

const parseYAML = yaml.default.parse.bind(yaml.default);

const REPO_ROOT = process.cwd();

export function readWorkflow(name: string): Record<string, unknown> | null {
  const path = join(REPO_ROOT, '.github/workflows', name);
  try {
    const content = readFileSync(path, 'utf8');
    return parseYAML(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readMergify(): Record<string, unknown> | null {
  const path = join(REPO_ROOT, '.mergify.yml');
  try {
    const content = readFileSync(path, 'utf8');
    return parseYAML(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readFixture(name: string): Record<string, unknown> | null {
  const path = join(REPO_ROOT, 'tests/ci/fixtures', name);
  try {
    const content = readFileSync(path, 'utf8');
    return parseYAML(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function parseYamlSafe(content: string): Record<string, unknown> | null {
  try {
    return parseYAML(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}
