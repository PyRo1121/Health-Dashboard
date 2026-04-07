import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseYamlSafe, readFixture } from './parse';

const REPO_ROOT = process.cwd();

describe('workflow YAML parsing', () => {
  it('parses a valid workflow fixture', () => {
    const result = readFixture('valid-workflow.yml');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('on');
    expect(result).toHaveProperty('jobs');
  });

  it('returns null for a malformed YAML fixture', () => {
    const result = parseYamlSafe('name: test\n  invalid: [');
    expect(result).toBeNull();
  });

  it('can parse all current workflow files without throwing', () => {
    const workflows = [
      'ai-review-grok-super.yml',
      'ai-auto-fix-grok.yml',
      'ci.yml',
      'e2e.yml',
      'pr-manager-grok.yml',
      'grok-describe.yml',
      'grok-pr-commands.yml',
      'grok-timeline.yml',
      'grok-walkthrough.yml',
      'grok-analytics.yml',
      'grok-ask.yml',
      'grok-ci-surgeon.yml',
      'codeql.yml',
      'danger.yml',
      'release.yml',
      'snyk.yml',
      'dast.yml',
      'branch-protection-audit.yml',
      'reviewdog.yml',
      'label-sync.yml',
      'changelog-maintenance.yml',
      'release-drafter.yml',
      'anti-slop.yml',
      'pr-manager-self-test.yml',
      'docs-inventory-sync.yml',
      'grok-threat-monitor.yml',
      'grok-pr-portfolio.yml',
      'grok-collections-bootstrap.yml',
    ];

    for (const wf of workflows) {
      const path = join(REPO_ROOT, '.github/workflows', wf);
      const content = readFileSync(path, 'utf8');
      const parsed = parseYamlSafe(content);
      expect(parsed).not.toBeNull();
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('on');
      expect(parsed).toHaveProperty('jobs');
    }
  });
});
