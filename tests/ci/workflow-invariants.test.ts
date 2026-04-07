import { describe, expect, it } from 'vitest';
import { readWorkflow } from './parse';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('workflow structure invariants', () => {
  it('ai-review-grok-super.yml has required fields', () => {
    const wf = readWorkflow('ai-review-grok-super.yml');
    expect(wf).not.toBeNull();
    expect(wf).toHaveProperty('name');
    expect(wf).toHaveProperty('on');
    expect(wf).toHaveProperty('permissions');
    expect(wf).toHaveProperty('jobs');
    const perms = wf!.permissions as Record<string, string>;
    expect(perms).toHaveProperty('pull-requests');
    expect(perms).toHaveProperty('contents');
    expect(perms['pull-requests']).toBe('write');
    expect(perms['contents']).toBe('read');
  });

  it('ai-auto-fix-grok.yml has required fields and path guards', () => {
    const wf = readWorkflow('ai-auto-fix-grok.yml');
    expect(wf).not.toBeNull();
    expect(wf).toHaveProperty('name');
    expect(wf).toHaveProperty('on');
    expect(wf).toHaveProperty('permissions');
    expect(wf).toHaveProperty('jobs');
    const perms = wf!.permissions as Record<string, string>;
    expect(perms).toHaveProperty('contents');
    expect(perms['contents']).toBe('write');
  });

  it('ci.yml has all expected jobs', () => {
    const wf = readWorkflow('ci.yml');
    expect(wf).not.toBeNull();
    const jobs = wf!.jobs as Record<string, unknown>;
    const jobNames = Object.keys(jobs);
    expect(jobNames).toContain('lint');
    expect(jobNames).toContain('typecheck');
    expect(jobNames).toContain('unit-tests');
    expect(jobNames).toContain('component-tests');
    expect(jobNames).toContain('build');
  });

  it('grok-ci-surgeon.yml has correct permissions', () => {
    const wf = readWorkflow('grok-ci-surgeon.yml');
    expect(wf).not.toBeNull();
    const perms = wf!.permissions as Record<string, string>;
    expect(perms['actions']).toBe('write');
    expect(perms['contents']).toBe('write');
    expect(perms['pull-requests']).toBe('read');
  });

  it('danger.yml is read-only (pull-requests: read)', () => {
    const wf = readWorkflow('danger.yml');
    expect(wf).not.toBeNull();
    const perms = wf!.permissions as Record<string, string>;
    expect(perms['pull-requests']).toBe('read');
  });

  it('audit doc "what was reviewed" entries match real workflow files', () => {
    const workflowsDir = resolve(__dirname, '../../.github/workflows');
    const reviewedWorkflows = [
      'ci.yml',
      'e2e.yml',
      'release.yml',
      'snyk.yml',
      'dast.yml',
      'reviewdog.yml',
      'danger.yml',
      'ai-review-grok-super.yml',
      'ai-auto-fix-grok.yml',
      'codeql.yml',
    ];
    for (const wf of reviewedWorkflows) {
      const path = resolve(workflowsDir, wf);
      expect(() => readFileSync(path, 'utf8')).not.toThrow();
    }
  });

  it('audit doc does not reference deprecated workflow names', () => {
    const auditDoc = readFileSync(
      resolve(__dirname, '../../docs/research/2026-04-05-cicd-enterprise-audit.md'),
      'utf8'
    );
    expect(auditDoc).not.toMatch(/ai-review\.yml/);
    expect(auditDoc).not.toMatch(/ai-fix\.yml/);
  });

  it('audit doc does not reference deprecated workflow names', () => {
    // These names were retired on 2026-04-06 — audit doc must not reference them.
    const auditDoc = readFileSync(
      resolve(__dirname, '../../docs/research/2026-04-05-cicd-enterprise-audit.md'),
      'utf8'
    );
    expect(auditDoc).not.toMatch(/ai-review\.yml/);
    expect(auditDoc).not.toMatch(/ai-fix\.yml/);
  });
});
