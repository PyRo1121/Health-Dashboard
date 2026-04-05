import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

describe('today route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/features/today/controller');
    vi.doUnmock('$lib/server/http/action-route');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    db?: HealthDatabase;
    loadTodayPage?: ReturnType<typeof vi.fn>;
    saveTodayPage?: ReturnType<typeof vi.fn>;
    logTodayPlannedMealPage?: ReturnType<typeof vi.fn>;
    clearTodayPlannedMealPage?: ReturnType<typeof vi.fn>;
    markTodayPlanSlotStatusPage?: ReturnType<typeof vi.fn>;
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
    vi.doMock('$lib/features/today/controller', () => ({
      loadTodayPage:
        overrides.loadTodayPage ??
        vi.fn(async () => ({
          loading: false,
          saving: false,
          saveNotice: '',
          todayDate: '2026-04-04',
          snapshot: null,
          form: {
            mood: '',
            energy: '',
            stress: '',
            focus: '',
            sleepHours: '',
            sleepQuality: '',
            freeformNote: '',
          },
        })),
      saveTodayPage:
        overrides.saveTodayPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Saved for today.',
        })),
      logTodayPlannedMealPage:
        overrides.logTodayPlannedMealPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Planned meal logged.',
        })),
      clearTodayPlannedMealPage:
        overrides.clearTodayPlannedMealPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Planned meal cleared.',
        })),
      markTodayPlanSlotStatusPage:
        overrides.markTodayPlanSlotStatusPage ??
        vi.fn(async (database: HealthDatabase, state: unknown) => ({
          ...(state as object),
          saveNotice: 'Plan item marked done.',
        })),
    }));

    return await import('../../../../src/routes/api/today/+server.ts');
  }

  it('loads today page state through the action route', async () => {
    const db = {} as HealthDatabase;
    const loadTodayPage = vi.fn(async () => ({
      loading: false,
      saving: false,
      saveNotice: '',
      todayDate: '2026-04-04',
      snapshot: null,
      form: {
        mood: '',
        energy: '',
        stress: '',
        focus: '',
        sleepHours: '',
        sleepQuality: '',
        freeformNote: '',
      },
    }));
    const { POST } = await importRoute({ db, loadTodayPage });

    const response = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'load', localDay: '2026-04-04' }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        todayDate: '2026-04-04',
        loading: false,
      })
    );
    expect(loadTodayPage).toHaveBeenCalledWith(db, '2026-04-04');
  });

  it('dispatches save, planned meal, and plan slot actions through the action route', async () => {
    const db = {} as HealthDatabase;
    const state = {
      loading: false,
      saving: false,
      saveNotice: '',
      todayDate: '2026-04-04',
      snapshot: null,
      form: {
        mood: '4',
        energy: '3',
        stress: '2',
        focus: '5',
        sleepHours: '7.5',
        sleepQuality: '4',
        freeformNote: 'Steady start.',
      },
    };
    const saveTodayPage = vi.fn(async () => ({ ...state, saveNotice: 'Saved for today.' }));
    const logTodayPlannedMealPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Planned meal logged.',
    }));
    const clearTodayPlannedMealPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Planned meal cleared.',
    }));
    const markTodayPlanSlotStatusPage = vi.fn(async () => ({
      ...state,
      saveNotice: 'Plan item marked done.',
    }));
    const { POST } = await importRoute({
      db,
      saveTodayPage,
      logTodayPlannedMealPage,
      clearTodayPlannedMealPage,
      markTodayPlanSlotStatusPage,
    });

    const saveResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await saveResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Saved for today.' })
    );
    expect(saveTodayPage).toHaveBeenCalledWith(db, state);

    const logResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'logPlannedMeal', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await logResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Planned meal logged.' })
    );
    expect(logTodayPlannedMealPage).toHaveBeenCalledWith(db, state);

    const clearResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearPlannedMeal', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await clearResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Planned meal cleared.' })
    );
    expect(clearTodayPlannedMealPage).toHaveBeenCalledWith(db, state);

    const markResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({
          action: 'markPlanSlotStatus',
          state,
          slotId: 'slot-1',
          status: 'done',
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await markResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Plan item marked done.' })
    );
    expect(markTodayPlanSlotStatusPage).toHaveBeenCalledWith(db, state, 'slot-1', 'done');
  });
});
