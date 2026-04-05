import { afterEach, describe, expect, it, vi } from 'vitest';

describe('review client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes review load and save actions through the feature action client', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/review/client.ts');
    const state = {
      ...client.createReviewPageState(),
      localDay: '2026-04-04',
      weekly: null,
      selectedExperiment: 'Increase hydration tracking',
    };

    await client.loadReviewPage('2026-04-04');
    await client.saveReviewExperimentPage(state);

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/review');
    expect(action).toHaveBeenCalledWith('load', expect.any(Function), { localDay: '2026-04-04' });
    expect(stateAction).toHaveBeenCalledWith('saveExperiment', state, expect.any(Function));
  });
});
