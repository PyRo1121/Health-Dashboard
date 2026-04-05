import { describe, expect, it } from 'vitest';
import { createHealthDb } from '$lib/core/db/client';
import { DB_NAME, SCHEMA_STORES } from '$lib/core/db/schema';
import { deleteNamedHealthDb } from '../../../support/unit/testDb';

describe('database schema', () => {
  it('opens with the expected table names', async () => {
    const db = createHealthDb(DB_NAME);
    await db.open();

    expect(db.tables.map((table) => table.name).sort()).toEqual(Object.keys(SCHEMA_STORES).sort());
    db.close();
    await deleteNamedHealthDb(DB_NAME);
  });
});
