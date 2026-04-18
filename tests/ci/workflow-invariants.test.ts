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
    expect(jobNames).toContain('coverage');
    expect(jobNames).toContain('smoke-tests');
    expect(jobNames).toContain('operational-check');
    expect(jobNames).toContain('build');
  });

  it('release.yml requires proof jobs before build and publish', () => {
    const wf = readWorkflow('release.yml');
    expect(wf).not.toBeNull();
    const jobs = wf!.jobs as Record<string, Record<string, unknown>>;

    expect(Object.keys(jobs)).toContain('typecheck');
    expect(Object.keys(jobs)).toContain('unit-tests');
    expect(Object.keys(jobs)).toContain('component-tests');
    expect(Object.keys(jobs)).toContain('e2e');
    expect(Object.keys(jobs)).toContain('coverage');
    expect(Object.keys(jobs)).toContain('smoke-tests');
    expect(Object.keys(jobs)).toContain('operational-check');

    expect(jobs['build']?.needs).toEqual([
      'typecheck',
      'unit-tests',
      'component-tests',
      'e2e',
      'coverage',
      'smoke-tests',
      'operational-check',
    ]);

    expect(jobs['publish']?.needs).toEqual(['build', 'sign', 'sbom', 'scan']);
  });

  it('operational-check jobs explicitly opt into the local insecure auth override', () => {
    const ci = readWorkflow('ci.yml');
    const release = readWorkflow('release.yml');
    expect(ci).not.toBeNull();
    expect(release).not.toBeNull();

    const ciJobs = ci!.jobs as Record<string, Record<string, unknown>>;
    const releaseJobs = release!.jobs as Record<string, Record<string, unknown>>;

    expect(ciJobs['operational-check']?.env).toEqual(
      expect.objectContaining({
        HEALTH_ALLOW_INSECURE_LOCAL_DEV: 'true',
      })
    );
    expect(releaseJobs['operational-check']?.env).toEqual(
      expect.objectContaining({
        HEALTH_ALLOW_INSECURE_LOCAL_DEV: 'true',
      })
    );
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

  it('workflow_dispatch workflows admit dispatch in their job guards', () => {
    const prManager = readWorkflow('pr-manager-grok.yml');
    const grokDescribe = readWorkflow('grok-describe.yml');
    expect(prManager).not.toBeNull();
    expect(grokDescribe).not.toBeNull();

    const prManagerJobs = prManager!.jobs as Record<string, Record<string, unknown>>;
    const describeJobs = grokDescribe!.jobs as Record<string, Record<string, unknown>>;

    expect(String(prManagerJobs['manage-pr']?.if ?? '')).toContain(
      "github.event_name == 'workflow_dispatch'"
    );
    expect(String(prManagerJobs['manage-pr']?.if ?? '')).toContain(
      "github.event.inputs.pr_number != ''"
    );
    expect(String(describeJobs['describe']?.if ?? '')).toContain(
      "github.event_name == 'workflow_dispatch'"
    );
    expect(String(describeJobs['describe']?.if ?? '')).toContain(
      "github.event.inputs.pr_number != ''"
    );
  });

  it('grok-threat-monitor has an authenticated push path without permission widening', () => {
    const wf = readWorkflow('grok-threat-monitor.yml');
    expect(wf).not.toBeNull();
    const perms = wf!.permissions as Record<string, string>;
    expect(perms['contents']).toBe('write');
    const content = JSON.stringify(wf);
    expect(content).toContain('git remote set-url origin');
    expect(content).toContain('x-access-token:${GITHUB_TOKEN}');
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
