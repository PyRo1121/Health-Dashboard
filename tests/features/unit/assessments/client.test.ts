import { afterEach, describe, expect, it, vi } from 'vitest';

describe('assessments client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes assessment actions through the feature action client with the expected payloads', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/assessments/client.ts');
    const state = {
      ...client.createAssessmentsPageState(),
      localDay: '2026-04-04',
      instrument: 'PHQ-9' as const,
      draftResponses: [1, 1, 1, 1, 1, 0, 0, 0, 0],
    };

    await client.loadAssessmentsPage(state, '2026-04-04');
    await client.saveAssessmentsProgressPage(state);
    await client.submitAssessmentsPage(state);

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/assessments');
    expect(stateAction).toHaveBeenNthCalledWith(1, 'load', state, expect.any(Function), {
      localDay: '2026-04-04',
    });
    expect(stateAction).toHaveBeenNthCalledWith(2, 'saveProgress', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(3, 'submit', state, expect.any(Function));
    expect(action).not.toHaveBeenCalled();
  });
});
