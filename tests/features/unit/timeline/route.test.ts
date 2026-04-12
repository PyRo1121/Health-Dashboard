import { afterEach, describe, expect, it, vi } from 'vitest';

describe('timeline route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/timeline/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: { loadTimelinePageServer?: ReturnType<typeof vi.fn> }) {
    vi.doMock('$lib/server/timeline/service', () => ({
      loadTimelinePageServer:
        overrides.loadTimelinePageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          loading: false,
          items: [],
        })),
    }));

    return await import('../../../../src/routes/api/timeline/+server.ts');
  }

  it('loads timeline page state through the server route', async () => {
    const state = { loading: true, filter: 'native-companion', items: [] };
    const loadTimelinePageServer = vi.fn(async () => ({
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
    const { POST } = await importRoute({ loadTimelinePageServer });

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
    expect(loadTimelinePageServer).toHaveBeenCalledWith(state);
  });

  it('returns 400 for invalid timeline payloads', async () => {
    const { POST } = await importRoute({});
    const response = await POST({
      request: new Request('http://health.test/api/timeline', {
        method: 'POST',
        body: JSON.stringify({ action: 'load' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid timeline request payload.');
  });
});
