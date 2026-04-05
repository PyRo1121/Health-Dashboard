import 'fake-indexeddb/auto';

import { afterEach, beforeEach } from 'vitest';
import { createHealthDb, type HealthDatabase } from '$lib/core/db/client';

export function useTestHealthDb(prefix: string): () => HealthDatabase {
  let db: HealthDatabase;

  beforeEach(() => {
    db = createHealthDb(`${prefix}-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  return () => db;
}

export async function deleteNamedHealthDb(name: string): Promise<void> {
  const db = createHealthDb(name);
  db.close();
  await db.delete();
}
