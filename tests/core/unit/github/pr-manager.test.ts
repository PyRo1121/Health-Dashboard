import { describe, expect, it } from 'vitest';

import {
  buildBaselinePlan,
  buildManagedLabels,
  buildReviewThreadActions,
} from '../../../../.github/scripts/pr-manager.mjs';

function makeContext(overrides = {}) {
  return {
    repository: 'PyRo1121/Health-Dashboard',
    number: 17,
    title: 'Test PR',
    author: 'pyro1121',
    authorAssociation: 'OWNER',
    headRepositoryFullName: 'PyRo1121/Health-Dashboard',
    headCommittedAt: '2026-04-05T13:00:00Z',
    isDraft: false,
    mergeStateStatus: 'clean',
    headSha: 'head-sha',
    labels: [],
    files: [
      { filename: 'src/routes/+page.svelte', status: 'modified', additions: 5, deletions: 1 },
    ],
    reviews: [
      {
        user: { login: 'reviewer' },
        state: 'APPROVED',
        submitted_at: '2026-04-05T12:00:00Z',
        commit_id: 'head-sha',
      },
    ],
    checkRuns: [],
    commitStatuses: [],
    reviewThreads: [],
    ...overrides,
  };
}

describe('pr-manager baseline plan', () => {
  it('blocks on pending commit statuses even when no check runs are present', () => {
    const plan = buildBaselinePlan(
      makeContext({
        commitStatuses: [{ context: 'external-ci', state: 'pending' }],
        reviews: [],
      })
    );

    expect(plan.status).toBe('blocked-ci');
    expect(plan.checkSummary.pending).toEqual(['external-ci']);
  });

  it('blocks automation changes until the self-test context reports', () => {
    const plan = buildBaselinePlan(
      makeContext({
        files: [
          {
            filename: '.github/workflows/pr-manager-grok.yml',
            status: 'modified',
            additions: 3,
            deletions: 1,
          },
        ],
      })
    );

    expect(plan.status).toBe('blocked-ci');
    expect(plan.blockers[0]).toContain('PR Manager Self-Test');
  });

  it('blocks merge-ready when unresolved review threads exist', () => {
    const plan = buildBaselinePlan(
      makeContext({
        reviewThreads: [
          {
            id: 'thread-1',
            isResolved: false,
            isOutdated: false,
            path: 'src/lib/app.ts',
            lastCommentAuthor: 'maintainer',
            lastCommentCreatedAt: '2026-04-05T12:30:00Z',
          },
        ],
      })
    );

    expect(plan.status).toBe('blocked-review');
    expect(plan.reviewThreadSummary.unresolvedCount).toBe(1);
  });

  it('does not block on automation threads that are eligible for auto-resolution', () => {
    const plan = buildBaselinePlan(
      makeContext({
        reviewThreads: [
          {
            id: 'thread-2',
            isResolved: false,
            isOutdated: false,
            path: 'src/lib/app.ts',
            lastCommentAuthor: 'reviewdog[bot]',
            lastCommentBodyText: 'reviewdog found a lint issue here',
            lastCommentCreatedAt: '2026-04-05T12:00:00Z',
          },
        ],
      })
    );

    expect(plan.status).toBe('merge-ready');
    expect(plan.reviewThreadSummary.automationUnresolvedCount).toBe(1);
    expect(plan.reviewThreadSummary.resolvableAutomationCount).toBe(1);
  });
});

describe('pr-manager managed labels', () => {
  it('enables trusted repair lanes and strips legacy automerge', () => {
    const context = makeContext({
      labels: ['has-patch', 'automerge'],
      files: [{ filename: 'src/lib/example.ts', status: 'modified', additions: 4, deletions: 0 }],
    });
    const plan = buildBaselinePlan(context);
    const labels = buildManagedLabels(context, plan);

    expect(labels.labelsToAdd).toContain('ai-autopilot');
    expect(labels.labelsToAdd).toContain('ai-auto-fix');
    expect(labels.labelsToRemove).toContain('automerge');
  });

  it('does not dispatch auto-fix when protected paths are in the PR', () => {
    const context = makeContext({
      labels: ['has-patch'],
      files: [
        {
          filename: 'docs/ops/grok-pr-automation.md',
          status: 'modified',
          additions: 4,
          deletions: 0,
        },
      ],
    });
    const plan = buildBaselinePlan(context);
    const labels = buildManagedLabels(context, plan);

    expect(labels.labelsToAdd).toContain('ai-autopilot');
    expect(labels.labelsToAdd).not.toContain('ai-auto-fix');
  });

  it('builds review-thread resolution actions only for eligible automation notes', () => {
    const context = makeContext({
      reviewThreads: [
        {
          id: 'thread-3',
          isResolved: false,
          isOutdated: false,
          path: 'src/lib/example.ts',
          lastCommentAuthor: 'reviewdog[bot]',
          lastCommentBodyText: 'reviewdog found an issue',
          lastCommentCreatedAt: '2026-04-05T12:00:00Z',
        },
      ],
    });
    const mergeReadyPlan = buildBaselinePlan(context);

    const actions = buildReviewThreadActions(context, mergeReadyPlan);

    expect(actions.resolve).toHaveLength(1);
    expect(actions.resolve[0]).toMatchObject({
      id: 'thread-3',
      author: 'reviewdog[bot]',
    });
  });
});
