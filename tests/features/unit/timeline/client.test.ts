import { afterEach, describe, expect, it, vi } from 'vitest';

describe('timeline client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes timeline load through the feature action client with the expected payload', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/timeline/client.ts');
    const state = {
      ...client.createTimelinePageState(),
      filter: 'native-companion' as const,
    };

    await client.loadTimelinePage(state);

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/timeline');
    expect(stateAction).toHaveBeenCalledWith('load', state, expect.any(Function));
    expect(action).not.toHaveBeenCalled();
  });
});
