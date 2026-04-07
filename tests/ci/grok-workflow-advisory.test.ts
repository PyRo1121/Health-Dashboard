import { describe, expect, it } from 'vitest';
import { readWorkflow } from './parse';

describe('grok-review workflow advisory behavior', () => {
  it('ai-review-grok-super.yml is read-only advisory (pull-requests: write, contents: read)', () => {
    const wf = readWorkflow('ai-review-grok-super.yml');
    expect(wf).not.toBeNull();
    const perms = wf!.permissions as Record<string, string>;
    expect(perms['pull-requests']).toBe('write');
    expect(perms['contents']).toBe('read');
    expect(perms['issues']).toBe('write');
  });

  it('ai-review-grok-super.yml only runs on same-repo PRs (not forks)', () => {
    const wf = readWorkflow('ai-review-grok-super.yml');
    expect(wf).not.toBeNull();
    const jobs = wf!.jobs as Record<string, Record<string, unknown>>;
    const grokReview = jobs['grok-review'];
    expect(grokReview).not.toBeUndefined();
    const ifCond = String(grokReview['if'] ?? '');
    expect(ifCond).toContain('github.event.pull_request.head.repo.full_name == github.repository');
  });

  it('ai-review-grok-super.yml emits stable status context', () => {
    const wf = readWorkflow('ai-review-grok-super.yml');
    expect(wf).not.toBeNull();
    const content = JSON.stringify(wf);
    expect(content).toContain('Grok');
  });

  it('ai-review-grok-super.yml has no workflow_dispatch trigger', () => {
    const wf = readWorkflow('ai-review-grok-super.yml');
    expect(wf).not.toBeNull();
    const on = wf!.on;
    const triggers = Array.isArray(on) ? on : [on];
    const triggerNames = triggers.map((t) => (typeof t === 'string' ? t : Object.keys(t)[0]));
    expect(triggerNames).not.toContain('workflow_dispatch');
  });
});

describe('grok-auto-fix workflow mutation guard', () => {
  it('ai-auto-fix-grok.yml rejects fork PRs in guard step', () => {
    const wf = readWorkflow('ai-auto-fix-grok.yml');
    expect(wf).not.toBeNull();
    const content = JSON.stringify(wf);
    expect(content).toContain('skip_reason=fork-pr');
    expect(content).toContain('skip_reason=');
  });

  it('ai-auto-fix-grok.yml guards protected paths', () => {
    const wf = readWorkflow('ai-auto-fix-grok.yml');
    expect(wf).not.toBeNull();
    const content = JSON.stringify(wf);
    expect(content).toContain('skip_reason=protected-paths');
    expect(content).toContain('.github/');
    expect(content).toContain('tests/');
    expect(content).toContain('docs/');
  });

  it('ai-auto-fix-grok.yml never uses git add -A', () => {
    const wf = readWorkflow('ai-auto-fix-grok.yml');
    expect(wf).not.toBeNull();
    const content = JSON.stringify(wf);
    expect(content).not.toContain('git add -A');
  });
});
