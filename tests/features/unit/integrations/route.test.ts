import { afterEach, describe, expect, it, vi } from 'vitest';

describe('integrations route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/integrations/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('loads integrations state through the server route', async () => {
    const loadIntegrationsPageServer = vi.fn(async () => ({
      loading: false,
      summary: {
        importedEvents: 3,
        deviceNames: ['Pyro iPhone'],
        metricTypes: ['resting-heart-rate', 'sleep-duration', 'step-count'],
        latestCaptureAt: '2026-04-02T07:00:00Z',
      },
    }));
    vi.doMock('$lib/server/integrations/service', () => ({ loadIntegrationsPageServer }));
    const { POST } = await import('../../../../src/routes/api/integrations/+server.ts');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        loading: false,
        summary: expect.objectContaining({
          importedEvents: 3,
          deviceNames: ['Pyro iPhone'],
        }),
      })
    );
    expect(loadIntegrationsPageServer).toHaveBeenCalledTimes(1);
  });
});
