import type { HealthDbLifecycle, HealthDbStores } from '$lib/core/db/types';
import { createInMemoryHealthDb } from '$lib/core/db/in-memory';
import { SCHEMA_STORES } from './schema';

export type InMemoryTestHealthDbStores = HealthDbStores;
export type InMemoryTestHealthDbLifecycle = HealthDbLifecycle;
export type InMemoryTestHealthRuntime = InMemoryTestHealthDbStores & InMemoryTestHealthDbLifecycle;
export type InMemoryTestHealthDatabase = InMemoryTestHealthRuntime & {
  open(): Promise<void>;
  tables: Array<{ name: string }>;
};

const TABLES = Object.keys(SCHEMA_STORES).map((name) => ({ name }));

function createClientHealthDb(): InMemoryTestHealthDatabase {
  return Object.assign(createInMemoryHealthDb(), {
    async open() {},
    tables: TABLES,
  });
}

let testDb: InMemoryTestHealthDatabase | null = null;

export function createTestHealthDb(): InMemoryTestHealthDatabase;
export function createTestHealthDb<Store>(select: (db: InMemoryTestHealthDatabase) => Store): Store;
export function createTestHealthDb<Store>(
  select?: (db: InMemoryTestHealthDatabase) => Store
): InMemoryTestHealthDatabase | Store {
  const db = createClientHealthDb();
  return select ? select(db) : db;
}

export function getTestHealthDb(): InMemoryTestHealthDatabase;
export function getTestHealthDb<Store>(select: (db: InMemoryTestHealthDatabase) => Store): Store;
export function getTestHealthDb<Store>(
  select?: (db: InMemoryTestHealthDatabase) => Store
): InMemoryTestHealthDatabase | Store {
  if (!testDb) {
    testDb = createClientHealthDb();
  }

  return select ? select(testDb) : testDb;
}

export async function resetTestHealthDb(): Promise<void> {
  if (!testDb) {
    return;
  }

  testDb.close();
  await testDb.delete();
  testDb = null;
}
