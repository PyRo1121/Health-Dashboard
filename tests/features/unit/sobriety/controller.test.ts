import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  createSobrietyPageState,
  loadSobrietyPage,
  markSobrietyStatus,
  saveSobrietyCraving,
  saveSobrietyLapse,
} from '$lib/features/sobriety/controller';

describe('sobriety controller', () => {
  const getDb = useTestHealthDb();

  it('loads sobriety state and runs sober/craving/lapse actions', async () => {
    const db = getDb();
    let state = await loadSobrietyPage(db, '2026-04-02', createSobrietyPageState());
    state = await markSobrietyStatus(db, state, 'sober', 'Marked sober for today.');
    expect(state.saveNotice).toBe('Marked sober for today.');
    expect(state.summary.streak).toBe(1);
    expect(await db.reviewSnapshots.count()).toBe(1);

    state = await saveSobrietyCraving(db, {
      ...state,
      cravingScore: '4',
      cravingNote: 'Stress spike after lunch.',
    });
    expect(state.saveNotice).toBe('Craving logged.');
    expect(state.cravingNote).toBe('');
    expect(await db.reviewSnapshots.count()).toBe(1);

    state = await saveSobrietyLapse(db, {
      ...state,
      lapseNote: 'Had a lapse after a rough evening.',
      recoveryAction: 'Text sponsor',
    });
    expect(state.saveNotice).toBe('Lapse context logged.');
    expect(state.summary.todayEvents.length).toBeGreaterThanOrEqual(3);
    expect(await db.reviewSnapshots.count()).toBe(1);
  });
});
