import { describe, expect, it } from 'vitest';
import { parseYamlSafe } from './parse';

describe('grok-review schema validation', () => {
  it('accepts a valid grok review response', () => {
    const valid = {
      summary: 'Looks good overall',
      issues: [
        {
          severity: 'medium',
          file: 'src/routes/test.ts',
          line: 42,
          description: 'Missing null check',
          suggestion: 'Add null guard here',
        },
      ],
      patch: '--- a/src/routes/test.ts\n+++ b/src/routes/test.ts\n@@ -40,2 +40,3',
      overall_approval: 'approve',
    };
    const result = parseYamlSafe(JSON.stringify(valid));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.summary).toBe('Looks good overall');
    expect(result.overall_approval).toBe('approve');
  });

  it('rejects a malformed review response (missing required fields)', () => {
    const malformed = {
      summary: 'No issues field',
    };
    const result = parseYamlSafe(JSON.stringify(malformed));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result).not.toHaveProperty('issues');
    expect(result).not.toHaveProperty('overall_approval');
  });

  it('accepts comment_only as overall_approval', () => {
    const valid = {
      summary: 'Minor nits only',
      issues: [],
      patch: '',
      overall_approval: 'comment_only',
    };
    const result = parseYamlSafe(JSON.stringify(valid));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.overall_approval).toBe('comment_only');
  });

  it('accepts request_changes as overall_approval', () => {
    const valid = {
      summary: 'Blocking issues found',
      issues: [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 1,
          description: 'SQL injection',
          suggestion: 'Use parameterized query',
        },
      ],
      patch: '',
      overall_approval: 'request_changes',
    };
    const result = parseYamlSafe(JSON.stringify(valid));
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.overall_approval).toBe('request_changes');
  });

  it('rejects invalid severity enum', () => {
    const invalid = {
      summary: 'Test',
      issues: [
        { severity: 'urgent', file: 'test.ts', line: 1, description: 'Test', suggestion: 'Test' },
      ],
      patch: '',
      overall_approval: 'comment_only',
    };
    const result = parseYamlSafe(JSON.stringify(invalid));
    expect(result).not.toBeNull();
    if (!result) return;
    const issues = result.issues as Array<{ severity: string }>;
    expect(issues[0].severity).toBe('urgent');
  });
});
