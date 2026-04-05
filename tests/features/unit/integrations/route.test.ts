import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('integrations route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/integrations/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadIntegrationsPage?: ReturnType<typeof vi.fn>;
  }) {
    const db = overrides.db ?? ({} as HealthDatabase);
    const actual = await vi.importActual<typeof import('$lib/server/http/action-route')>(
      '$lib/server/http/action-route'
    );

    vi.doMock('$lib/server/http/action-route', () => ({
      ...actual,
      createDbActionPostHandler: (
        handlers: Parameters<typeof actual.createDbActionPostHandler>[0]
      ) =>
        actual.createDbActionPostHandler(handlers, {
          withDb: async (run) => await run(db),
          toResponse: (body) => Response.json(body),
        }),
    }));
    vi.doMock('$lib/features/integrations/controller', () => ({
      loadIntegrationsPage:
        overrides.loadIntegrationsPage ??
        vi.fn(async () => ({
          loading: false,
          summary: {
            importedEvents: 3,
            deviceNames: ['Pyro iPhone'],
            metricTypes: ['sleep-duration'],
            latestCaptureAt: '2026-04-02T07:00:00Z',
          },
        })),
    }));

    return await import('../../../../src/routes/api/integrations/+server.ts');
  }

  it('loads integrations state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadIntegrationsPage = vi.fn(async () => ({
      loading: false,
      summary: {
        importedEvents: 3,
        deviceNames: ['Pyro iPhone'],
        metricTypes: ['resting-heart-rate', 'sleep-duration', 'step-count'],
        latestCaptureAt: '2026-04-02T07:00:00Z',
      },
    }));
    const { POST } = await importRoute({ db, loadIntegrationsPage });

    const response = await POST({
      request: new Request('http://health.test/api/integrations', {
        method: 'POST',
        body: JSON.stringify({ action: 'load' }),
      }),
    } as Parameters<typeof POST>[0]);

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
    expect(loadIntegrationsPage).toHaveBeenCalledWith(db);
  });
});
