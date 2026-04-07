import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function readWorkflow(name: string) {
  return readFileSync(path.join(repoRoot, '.github/workflows', name), 'utf8');
}

describe('github workflow comment surfaces', () => {
  it('manages PR comments only on designated control-plane workflows', () => {
    const review = readWorkflow('ai-review-grok-super.yml');
    const manager = readWorkflow('pr-manager-grok.yml');
    const autoFix = readWorkflow('ai-auto-fix-grok.yml');
    const surgeon = readWorkflow('grok-ci-surgeon.yml');
    const danger = readWorkflow('danger.yml');

    expect(review).toContain('<!-- grok-super-review -->');
    expect(manager).toContain('<!-- grok-pr-manager -->');

    expect(autoFix).toContain('<!-- grok-auto-fix -->');
    expect(autoFix).toContain('issues.createComment');
    expect(autoFix).toContain('issues.updateComment');

    expect(surgeon).not.toContain('<!-- grok-ci-surgeon -->');
    expect(surgeon).not.toContain('issues.createComment');
    expect(surgeon).not.toContain('issues.updateComment');

    expect(danger).not.toContain('issues.createComment');
    expect(danger).not.toContain('issues.updateComment');
  });

  it('keeps Danger as a quiet check-only workflow', () => {
    const danger = readWorkflow('danger.yml');

    expect(danger).toContain('name: Danger PR Checks');
    expect(danger).toContain('pull-requests: read');
    expect(danger).not.toContain('pull-requests: write');
    expect(danger).not.toContain('issues: write');
  });
});
