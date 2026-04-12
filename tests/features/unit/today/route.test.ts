import { afterEach, describe, expect, it, vi } from 'vitest';

describe('today route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/today/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadTodayPageServer?: ReturnType<typeof vi.fn>;
    saveTodayPageServer?: ReturnType<typeof vi.fn>;
    logTodayPlannedMealPageServer?: ReturnType<typeof vi.fn>;
    clearTodayPlannedMealPageServer?: ReturnType<typeof vi.fn>;
    markTodayPlanSlotStatusPageServer?: ReturnType<typeof vi.fn>;
    applyTodayRecoveryActionPageServer?: ReturnType<typeof vi.fn>;
  }) {
    vi.doMock('$lib/server/today/service', () => ({
      loadTodayPageServer:
        overrides.loadTodayPageServer ??
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
      saveTodayPageServer:
        overrides.saveTodayPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          saveNotice: 'Saved for today.',
        })),
      logTodayPlannedMealPageServer:
        overrides.logTodayPlannedMealPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          saveNotice: 'Planned meal logged.',
        })),
      clearTodayPlannedMealPageServer:
        overrides.clearTodayPlannedMealPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          saveNotice: 'Planned meal cleared.',
        })),
      markTodayPlanSlotStatusPageServer:
        overrides.markTodayPlanSlotStatusPageServer ??
        vi.fn(async (state: unknown) => ({
          ...(state as object),
          saveNotice: 'Plan item marked done.',
        })),
      applyTodayRecoveryActionPageServer:
        overrides.applyTodayRecoveryActionPageServer ??
        vi.fn(async (state: unknown, actionId: string) => ({
          ...(state as object),
          saveNotice: `Recovery action applied: ${actionId}`,
        })),
    }));

    return await import('../../../../src/routes/api/today/+server.ts');
  }

  it('loads today page state through the server route', async () => {
    const loadTodayPageServer = vi.fn(async () => ({
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
    const { POST } = await importRoute({ loadTodayPageServer });

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
    expect(loadTodayPageServer).toHaveBeenCalledWith('2026-04-04');
  });

  it('dispatches save, planned meal, and plan slot actions through the server route', async () => {
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
    const saveTodayPageServer = vi.fn(async () => ({ ...state, saveNotice: 'Saved for today.' }));
    const logTodayPlannedMealPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Planned meal logged.',
    }));
    const clearTodayPlannedMealPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Planned meal cleared.',
    }));
    const markTodayPlanSlotStatusPageServer = vi.fn(async () => ({
      ...state,
      saveNotice: 'Plan item marked done.',
    }));
    const applyTodayRecoveryActionPageServer = vi.fn(async (_state, actionId: string) => ({
      ...state,
      saveNotice: `Recovery action applied: ${actionId}`,
    }));
    const { POST } = await importRoute({
      saveTodayPageServer,
      logTodayPlannedMealPageServer,
      clearTodayPlannedMealPageServer,
      markTodayPlanSlotStatusPageServer,
      applyTodayRecoveryActionPageServer,
    });

    const saveResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'save', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await saveResponse.json()).toEqual(expect.objectContaining({ saveNotice: 'Saved for today.' }));
    expect(saveTodayPageServer).toHaveBeenCalledWith(state);

    const logResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'logPlannedMeal', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await logResponse.json()).toEqual(expect.objectContaining({ saveNotice: 'Planned meal logged.' }));
    expect(logTodayPlannedMealPageServer).toHaveBeenCalledWith(state);

    const clearResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({ action: 'clearPlannedMeal', state }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await clearResponse.json()).toEqual(expect.objectContaining({ saveNotice: 'Planned meal cleared.' }));
    expect(clearTodayPlannedMealPageServer).toHaveBeenCalledWith(state);

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
    expect(await markResponse.json()).toEqual(expect.objectContaining({ saveNotice: 'Plan item marked done.' }));
    expect(markTodayPlanSlotStatusPageServer).toHaveBeenCalledWith(state, 'slot-1', 'done');

    const recoveryResponse = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({
          action: 'applyRecoveryAction',
          state,
          actionId: 'apply-recovery-meal',
        }),
      }),
    } as Parameters<typeof POST>[0]);
    expect(await recoveryResponse.json()).toEqual(
      expect.objectContaining({ saveNotice: 'Recovery action applied: apply-recovery-meal' })
    );
    expect(applyTodayRecoveryActionPageServer).toHaveBeenCalledWith(state, 'apply-recovery-meal');
  });

  it('returns 400 for invalid today action payloads', async () => {
    const loadTodayPageServer = vi.fn();
    const { POST } = await importRoute({ loadTodayPageServer });

    const response = await POST({
      request: new Request('http://health.test/api/today', {
        method: 'POST',
        body: JSON.stringify({
          action: 'markPlanSlotStatus',
          localDay: '2026-04-04',
        }),
      }),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid today request payload.');
    expect(loadTodayPageServer).not.toHaveBeenCalled();
  });
});
