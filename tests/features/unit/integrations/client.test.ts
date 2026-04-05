import { afterEach, describe, expect, it, vi } from 'vitest';

describe('integrations client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes integrations load through the feature action client', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/integrations/client.ts');

    await client.loadIntegrationsPage();

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/integrations');
    expect(action).toHaveBeenCalledWith('load', expect.any(Function));
    expect(stateAction).not.toHaveBeenCalled();
  });
});
