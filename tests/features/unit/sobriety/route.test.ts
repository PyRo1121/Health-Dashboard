import { afterEach, describe, expect, it, vi } from 'vitest';

describe('sobriety route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/sobriety/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadSobrietyPageServer?: ReturnType<typeof vi.fn>;
    markSobrietyStatusServer?: ReturnType<typeof vi.fn>;
    saveSobrietyCravingServer?: ReturnType<typeof vi.fn>;
    saveSobrietyLapseServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/sobriety/service', () => ({
      loadSobrietyPageServer:
        overrides.loadSobrietyPageServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          summary: { streak: 0, todayEvents: [] },
          saveNotice: '',
          cravingScore: '3',
          cravingNote: '',
          lapseNote: '',
          recoveryAction: '',
        })),
      markSobrietyStatusServer:
        overrides.markSobrietyStatusServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          summary: { streak: 1, todayEvents: [] },
          saveNotice: 'Marked sober for today.',
          cravingScore: '3',
          cravingNote: '',
          lapseNote: '',
          recoveryAction: '',
        })),
      saveSobrietyCravingServer:
        overrides.saveSobrietyCravingServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          summary: { streak: 1, todayEvents: [] },
          saveNotice: 'Craving logged.',
          cravingScore: '4',
          cravingNote: '',
          lapseNote: '',
          recoveryAction: '',
        })),
      saveSobrietyLapseServer:
        overrides.saveSobrietyLapseServer ??
        vi.fn(async () => ({
          loading: false,
          localDay: '2026-04-04',
          summary: { streak: 1, todayEvents: [] },
          saveNotice: 'Lapse context logged.',
          cravingScore: '4',
          cravingNote: '',
          lapseNote: '',
          recoveryAction: 'Text sponsor',
        })),
    }));
    return await import('../../../../src/routes/api/sobriety/+server.ts');
  }

  it('loads and dispatches sobriety actions through the server route', async () => {
    const { POST } = await importRoute({});
    const state = { loading: false, localDay: '2026-04-04', summary: { streak: 1, todayEvents: [] }, saveNotice: '', cravingScore: '4', cravingNote: 'Stress spike after lunch.', lapseNote: 'Had a lapse after a rough evening.', recoveryAction: 'Text sponsor' };
    expect(await (await POST({ request: new Request('http://health.test/api/sobriety', { method: 'POST', body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ localDay: '2026-04-04' }));
    expect(await (await POST({ request: new Request('http://health.test/api/sobriety', { method: 'POST', body: JSON.stringify({ action: 'markStatus', state, status: 'sober', notice: 'Marked sober for today.' }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Marked sober for today.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/sobriety', { method: 'POST', body: JSON.stringify({ action: 'saveCraving', state }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Craving logged.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/sobriety', { method: 'POST', body: JSON.stringify({ action: 'saveLapse', state }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Lapse context logged.' }));
  });

  it('returns 400 for invalid sobriety payloads', async () => {
    const { POST } = await importRoute({});
    const response = await POST({ request: new Request('http://health.test/api/sobriety', { method: 'POST', body: JSON.stringify({ action: 'markStatus', status: 'sober' }) }) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid sobriety request payload.');
  });
});
