import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('timeline route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/timeline/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadTimelinePage?: ReturnType<typeof vi.fn>;
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
    vi.doMock('$lib/features/timeline/controller', () => ({
      loadTimelinePage:
        overrides.loadTimelinePage ??
        vi.fn(async (_db: HealthDatabase, state: unknown) => ({
          ...(state as object),
          loading: false,
          items: [],
        })),
    }));

    return await import('../../../../src/routes/api/timeline/+server.ts');
  }

  it('loads timeline page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: true,
      filter: 'native-companion',
      items: [],
    };
    const loadTimelinePage = vi.fn(async () => ({
      ...state,
      loading: false,
      items: [
        {
          id: 'event-1',
          title: 'Resting heart rate',
          valueLabel: '57 bpm',
          recordedAt: '2026-04-02T07:00:00Z',
          sourceApp: 'HealthKit Companion · Pyro iPhone',
          sourceType: 'native-companion',
        },
      ],
    }));
    const { POST } = await importRoute({ db, loadTimelinePage });

    const response = await POST({
      request: new Request('http://health.test/api/timeline', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', state }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        loading: false,
        items: [expect.objectContaining({ title: 'Resting heart rate' })],
      })
    );
    expect(loadTimelinePage).toHaveBeenCalledWith(db, state);
  });
});
