import { describe, expect, it } from 'vitest';
import {
  buildSobrietyTrendSummary,
  calculateCurrentStreak,
  logCravingEvent,
  logLapseEvent,
  setSobrietyStatusForDay,
} from '$lib/features/sobriety/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('sobriety service', () => {
  const getDb = useTestHealthDb();

  it('calculates a current streak across consecutive sober days', async () => {
    const db = getDb();
    await setSobrietyStatusForDay(db, { localDay: '2026-04-01', status: 'sober' });
    await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
    await setSobrietyStatusForDay(db, { localDay: '2026-04-03', status: 'sober' });

    expect(await calculateCurrentStreak(db, '2026-04-03')).toBe(3);
  });

  it('resets the streak after a lapse edit', async () => {
    const db = getDb();
    await setSobrietyStatusForDay(db, { localDay: '2026-04-01', status: 'sober' });
    await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
    await setSobrietyStatusForDay(db, {
      localDay: '2026-04-02',
      status: 'lapse',
      note: 'Backfilled correction',
    });

    expect(await calculateCurrentStreak(db, '2026-04-02')).toBe(0);
  });

  it('includes craving and lapse events in the daily trend summary', async () => {
    const db = getDb();
    await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
    await logCravingEvent(db, {
      localDay: '2026-04-02',
      cravingScore: 4,
      triggerTags: ['stress'],
    });
    await logLapseEvent(db, {
      localDay: '2026-04-02',
      note: 'Had a lapse after a rough evening.',
      recoveryAction: 'Text sponsor',
    });

    const summary = await buildSobrietyTrendSummary(db, '2026-04-02');
    expect(summary.todayEvents).toHaveLength(3);
    expect(summary.todayEvents.some((event) => event.eventType === 'craving')).toBe(true);
    expect(summary.todayEvents.some((event) => event.eventType === 'lapse')).toBe(true);
  });
});
