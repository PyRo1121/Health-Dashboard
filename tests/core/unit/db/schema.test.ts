import { describe, expect, it } from 'vitest';
import { createTestHealthDb, getTestHealthDb, resetTestHealthDb } from '$lib/core/db/test-client';
import { SCHEMA_STORES } from '$lib/core/db/schema';

describe('database schema', () => {
  it('opens with the expected table names', async () => {
    const db = createTestHealthDb();
    await db.open();

    expect(db.tables.map((table) => table.name).sort()).toEqual(Object.keys(SCHEMA_STORES).sort());
    db.close();
    await db.delete();
  });

  it('supports projected selectors for the shared test db facade', async () => {
    const projection = getTestHealthDb((db) => ({ dailyRecords: db.dailyRecords }));

    expect(await projection.dailyRecords.count()).toBe(0);

    await resetTestHealthDb();
  });
});
