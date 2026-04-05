import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('review route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/review/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadReviewPage?: ReturnType<typeof vi.fn>;
    saveReviewExperimentPage?: ReturnType<typeof vi.fn>;
  }) {
    const db = overrides.db ?? ({} as HealthDatabase);
    const actual = await vi.importActual<typeof import('$lib/server/http/action-route')>(
      '$lib/server/http/action-route'
    );

    vi.doMock('$lib/server/http/action-route', () => ({
      ...actual,
      createDbActionPostHandler: (
        handlers: Parameters<typeof actual.createDbActionPostHandler>[0],
        _deps: Parameters<typeof actual.createDbActionPostHandler>[1],
        options: Parameters<typeof actual.createDbActionPostHandler>[2]
      ) =>
        actual.createDbActionPostHandler(
          handlers,
          {
            withDb: async (run) => await run(db),
            toResponse: (body) => Response.json(body),
          },
          options
        ),
    }));
    vi.doMock('$lib/features/review/controller', () => ({
      loadReviewPage:
        overrides.loadReviewPage ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          weekly: null,
          selectedExperiment: '',
          loadNotice: '',
          saveNotice: '',
        })),
      saveReviewExperimentPage:
        overrides.saveReviewExperimentPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Experiment saved.',
        })),
    }));

    return await import('../../../../src/routes/api/review/+server.ts');
  }

  it('loads review page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadReviewPage = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-04',
      weekly: { experimentOptions: ['More protein'] },
      selectedExperiment: 'More protein',
      loadNotice: '',
      saveNotice: '',
    }));
    const { POST } = await importRoute({ db, loadReviewPage });

    const response = await POST({
      request: new Request('http://health.test/api/review', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-04' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        localDay: '2026-04-04',
        loading: false,
      })
    );
    expect(loadReviewPage).toHaveBeenCalledWith(db, '2026-04-04');
  });

  it('saves the selected review experiment through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      localDay: '2026-04-04',
      weekly: { experimentOptions: ['More protein'] },
      selectedExperiment: 'More protein',
      loadNotice: '',
      saveNotice: '',
    };
    const saveReviewExperimentPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Experiment saved.',
    }));
    const { POST } = await importRoute({ db, saveReviewExperimentPage });

    const response = await POST({
      request: new Request('http://health.test/api/review', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveExperiment', state }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Experiment saved.' })
    );
    expect(saveReviewExperimentPage).toHaveBeenCalledWith(db, state);
  });

  it('returns 400 for invalid review action payloads', async () => {
    const loadReviewPage = vi.fn();
    const { POST } = await importRoute({ loadReviewPage });

    const response = await POST({
      request: new Request('http://health.test/api/review', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveExperiment', localDay: '2026-04-04' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid review request payload.');
    expect(loadReviewPage).not.toHaveBeenCalled();
  });
});
