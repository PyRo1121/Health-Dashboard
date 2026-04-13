import { afterEach, describe, expect, it, vi } from 'vitest';

describe('review route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/review/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadReviewPageServer?: ReturnType<typeof vi.fn>;
    saveReviewExperimentPageServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/review/service', () => ({
      loadReviewPageServer:
        overrides.loadReviewPageServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          weekly: null,
          selectedExperiment: '',
          loadNotice: '',
          saveNotice: '',
        })),
      saveReviewExperimentPageServer:
        overrides.saveReviewExperimentPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          saveNotice: 'Experiment saved.',
        })),
    }));

    return await import('../../../../src/routes/api/review/+server.ts');
  }

  it('loads review page state through the server route', async () => {
    const loadReviewPageServer = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-04',
      weekly: {
        experimentCandidates: [
          {
            id: 'more-protein',
            label: 'More protein',
            summary: 'Push protein sooner.',
            confidence: 'medium',
            expectedImpact: 'Raise protein consistency.',
          },
        ],
        experimentOptions: ['More protein'],
      },
      selectedExperiment: 'more-protein',
      loadNotice: '',
      saveNotice: '',
    }));
    const { POST } = await importRoute({ loadReviewPageServer });

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
    expect(loadReviewPageServer).toHaveBeenCalledWith('2026-04-04');
  });

  it('saves the selected review experiment through the server route', async () => {
    const state = {
      loading: false,
      localDay: '2026-04-04',
      weekly: {
        experimentCandidates: [
          {
            id: 'more-protein',
            label: 'More protein',
            summary: 'Push protein sooner.',
            confidence: 'medium',
            expectedImpact: 'Raise protein consistency.',
          },
        ],
        experimentOptions: ['More protein'],
      },
      selectedExperiment: 'more-protein',
      loadNotice: '',
      saveNotice: '',
    };
    const saveReviewExperimentPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Experiment saved.',
    }));
    const { POST } = await importRoute({ saveReviewExperimentPageServer });

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
    expect(saveReviewExperimentPageServer).toHaveBeenCalledWith(state);
  });

  it('returns 400 for invalid review action payloads', async () => {
    const loadReviewPageServer = vi.fn();
    const { POST } = await importRoute({ loadReviewPageServer });

    const response = await POST({
      request: new Request('http://health.test/api/review', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveExperiment', localDay: '2026-04-04' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid review request payload.');
    expect(loadReviewPageServer).not.toHaveBeenCalled();
  });

  it('returns 400 when saveExperiment weekly payload omits experiment candidate ids', async () => {
    const saveReviewExperimentPageServer = vi.fn();
    const { POST } = await importRoute({ saveReviewExperimentPageServer });

    const response = await POST({
      request: new Request('http://health.test/api/review', {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveExperiment',
          state: {
            loading: false,
            localDay: '2026-04-04',
            weekly: {
              experimentCandidates: [
                {
                  label: 'More protein',
                  summary: 'Push protein sooner.',
                  confidence: 'medium',
                  expectedImpact: 'Raise protein consistency.',
                },
              ],
              experimentOptions: ['More protein'],
            },
            selectedExperiment: 'more-protein',
            loadNotice: '',
            saveNotice: '',
          },
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid review request payload.');
    expect(saveReviewExperimentPageServer).not.toHaveBeenCalled();
  });
});
