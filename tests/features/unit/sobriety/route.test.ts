import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('sobriety route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/sobriety/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadSobrietyPage?: ReturnType<typeof vi.fn>;
    markSobrietyStatus?: ReturnType<typeof vi.fn>;
    saveSobrietyCraving?: ReturnType<typeof vi.fn>;
    saveSobrietyLapse?: ReturnType<typeof vi.fn>;
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
    vi.doMock('$lib/features/sobriety/controller', () => ({
      loadSobrietyPage:
        overrides.loadSobrietyPage ??
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
      markSobrietyStatus:
        overrides.markSobrietyStatus ??
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
      saveSobrietyCraving:
        overrides.saveSobrietyCraving ??
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
      saveSobrietyLapse:
        overrides.saveSobrietyLapse ??
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

  it('loads sobriety page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadSobrietyPage = vi.fn(async () => ({
      loading: false,
      localDay: '2026-04-04',
      summary: { streak: 1, todayEvents: [] },
      saveNotice: '',
      cravingScore: '3',
      cravingNote: '',
      lapseNote: '',
      recoveryAction: '',
    }));
    const { POST } = await importRoute({ db, loadSobrietyPage });

    const state = {
      loading: true,
      localDay: '',
      summary: { streak: 0, todayEvents: [] },
      saveNotice: '',
      cravingScore: '3',
      cravingNote: '',
      lapseNote: '',
      recoveryAction: '',
    };
    const response = await POST({
      request: new Request('http://health.test/api/sobriety', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        localDay: '2026-04-04',
        summary: { streak: 1, todayEvents: [] },
      })
    );
    expect(loadSobrietyPage).toHaveBeenCalledWith(db, '2026-04-04', state);
  });

  it('dispatches markStatus, saveCraving, and saveLapse through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      localDay: '2026-04-04',
      summary: { streak: 1, todayEvents: [] },
      saveNotice: '',
      cravingScore: '4',
      cravingNote: 'Stress spike after lunch.',
      lapseNote: 'Had a lapse after a rough evening.',
      recoveryAction: 'Text sponsor',
    };
    const markSobrietyStatus = vi.fn(async () => ({
      ...state,
      saveNotice: 'Marked sober for today.',
    }));
    const saveSobrietyCraving = vi.fn(async () => ({
      ...state,
      saveNotice: 'Craving logged.',
    }));
    const saveSobrietyLapse = vi.fn(async () => ({
      ...state,
      saveNotice: 'Lapse context logged.',
    }));
    const { POST } = await importRoute({
      db,
      markSobrietyStatus,
      saveSobrietyCraving,
      saveSobrietyLapse,
    });

    const markResponse = await POST({
      request: new Request('http://health.test/api/sobriety', {
        method: 'POST',
        body: JSON.stringify({
          action: 'markStatus',
          state,
          status: 'sober',
          notice: 'Marked sober for today.',
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await markResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Marked sober for today.' })
    );
    expect(markSobrietyStatus).toHaveBeenCalledWith(db, state, 'sober', 'Marked sober for today.');

    const cravingResponse = await POST({
      request: new Request('http://health.test/api/sobriety', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveCraving', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await cravingResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Craving logged.' })
    );
    expect(saveSobrietyCraving).toHaveBeenCalledWith(db, state);

    const lapseResponse = await POST({
      request: new Request('http://health.test/api/sobriety', {
        method: 'POST',
        body: JSON.stringify({ action: 'saveLapse', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await lapseResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Lapse context logged.' })
    );
    expect(saveSobrietyLapse).toHaveBeenCalledWith(db, state);
  });
});
