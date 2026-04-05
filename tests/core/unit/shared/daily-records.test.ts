import { describe, expect, it } from 'vitest';
import { upsertDailyRecord } from '$lib/core/shared/daily-records';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('daily-records', () => {
  const getDb = useTestHealthDb('shared-daily-records');

  it('upserts one record per day while preserving createdAt', async () => {
    const db = getDb();
    const first = await upsertDailyRecord(db, '2026-04-02', {
      mood: 4,
      energy: 3,
    });
    const second = await upsertDailyRecord(db, '2026-04-02', {
      stress: 2,
      focus: 5,
    });

    expect(first.id).toBe(second.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt >= first.updatedAt).toBe(true);
    expect(await db.dailyRecords.count()).toBe(1);
    expect(await db.dailyRecords.get(first.id)).toMatchObject({
      date: '2026-04-02',
      mood: 4,
      energy: 3,
      stress: 2,
      focus: 5,
    });
  });
});
