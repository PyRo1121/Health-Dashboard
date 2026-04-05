import { describe, expect, it } from 'vitest';

import { buildPrMetaAdvisories } from '../../../../.github/scripts/pr-meta-check.mjs';

describe('buildPrMetaAdvisories', () => {
  it('flags missing description and missing tests for code changes', () => {
    expect(
      buildPrMetaAdvisories({
        body: '',
        additions: 20,
        deletions: 5,
        changedFiles: ['src/lib/example.ts'],
      })
    ).toEqual([
      'PR description is empty or too short.',
      'PR includes code changes but no test updates.',
    ]);
  });

  it('flags large changesets', () => {
    expect(
      buildPrMetaAdvisories({
        body: 'Detailed PR description',
        additions: 1001,
        deletions: 20,
        changedFiles: ['src/lib/example.ts', 'tests/example.test.ts'],
      })
    ).toEqual([
      'This PR is very large (>500 changed lines). Consider splitting it.',
      'This PR adds more than 1000 lines. Consider breaking it down.',
    ]);
  });

  it('stays quiet for a described, tested PR', () => {
    expect(
      buildPrMetaAdvisories({
        body: 'Adds tested change.',
        additions: 20,
        deletions: 5,
        changedFiles: ['src/lib/example.ts', 'tests/example.test.ts'],
      })
    ).toEqual([]);
  });
});
