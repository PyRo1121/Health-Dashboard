import { afterEach, describe, expect, it, vi } from 'vitest';

describe('today client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('routes today actions through the feature action client with the expected payloads', async () => {
    const action = vi.fn();
    const stateAction = vi.fn();
    const createFeatureActionClient = vi.fn(() => ({
      action,
      stateAction,
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
    }));

    const client = await import('../../../../src/lib/features/today/client.ts');
    const state = {
      ...client.createTodayPageState(),
      todayDate: '2026-04-04',
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

    await client.loadTodayPage('2026-04-04');
    await client.saveTodayPage(state);
    await client.logTodayPlannedMealPage(state);
    await client.clearTodayPlannedMealPage(state);
    await client.markTodayPlanSlotStatusPage(state, 'slot-1', 'done');

    expect(createFeatureActionClient).toHaveBeenCalledWith('/api/today');
    expect(action).toHaveBeenCalledWith('load', expect.any(Function), { localDay: '2026-04-04' });
    expect(stateAction).toHaveBeenNthCalledWith(1, 'save', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(2, 'logPlannedMeal', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(3, 'clearPlannedMeal', state, expect.any(Function));
    expect(stateAction).toHaveBeenNthCalledWith(
      4,
      'markPlanSlotStatus',
      state,
      expect.any(Function),
      { slotId: 'slot-1', status: 'done' }
    );
  });
});
