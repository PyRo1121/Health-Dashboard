import { describe, expect, it } from 'vitest';
import {
  createLocalDayPageState,
  loadLocalDayPageState,
  reloadLocalDayPageState,
} from '$lib/core/shared/local-day-page';

describe('local day page helpers', () => {
  it('creates a baseline local-day page state with shared defaults', () => {
    expect(
      createLocalDayPageState({
        summary: { streak: 0 },
      })
    ).toEqual({
      loading: true,
      localDay: '',
      saveNotice: '',
      summary: { streak: 0 },
    });
  });

  it('loads data for a specific local day and applies it to state', async () => {
    const initial = {
      loading: true,
      localDay: '',
      saveNotice: '',
      summary: { streak: 0 },
    };

    const next = await loadLocalDayPageState(
      initial,
      '2026-04-03',
      async (localDay) => ({
        localDay,
        summary: { streak: 2 },
      }),
      (state, localDay, data) => ({
        ...state,
        loading: false,
        localDay,
        summary: data.summary,
      })
    );

    expect(next).toEqual({
      loading: false,
      localDay: '2026-04-03',
      saveNotice: '',
      summary: { streak: 2 },
    });
  });

  it('reloads using the current local day and merges overrides after applying data', async () => {
    const state = {
      loading: false,
      localDay: '2026-04-03',
      saveNotice: '',
      summary: { streak: 1 },
    };

    const next = await reloadLocalDayPageState(
      state,
      async (localDay) => ({
        localDay,
        summary: { streak: 3 },
      }),
      (current, data) => ({
        ...current,
        summary: data.summary,
        saveNotice: 'reloaded',
      }),
      { saveNotice: 'override wins' }
    );

    expect(next).toEqual({
      loading: false,
      localDay: '2026-04-03',
      saveNotice: 'override wins',
      summary: { streak: 3 },
    });
  });
});
