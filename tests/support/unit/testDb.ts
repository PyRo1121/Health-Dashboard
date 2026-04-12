import { afterEach, beforeEach } from 'vitest';
import { createInMemoryHealthDb } from '$lib/core/db/in-memory';
import type { InMemoryTestHealthRuntime } from '$lib/core/db/test-client';

export function useTestHealthDb<Store = InMemoryTestHealthRuntime>(
  select?: (db: InMemoryTestHealthRuntime) => Store
): () => Store {
  let db: InMemoryTestHealthRuntime;

  beforeEach(() => {
    db = createInMemoryHealthDb();
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  return () => (select ? select(db) : (db as unknown as Store));
}
