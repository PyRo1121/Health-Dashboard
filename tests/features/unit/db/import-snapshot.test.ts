import { describe, expect, it } from 'vitest';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import { importHealthDbSnapshot } from '$lib/server/db/drizzle/import-snapshot';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';

type TableName = keyof HealthDbSnapshot;

function createSnapshot(): HealthDbSnapshot {
  return {
    dailyRecords: [],
    journalEntries: [],
    foodEntries: [],
    foodCatalogItems: [],
    recipeCatalogItems: [],
    weeklyPlans: [],
    planSlots: [],
    derivedGroceryItems: [],
    manualGroceryItems: [],
    workoutTemplates: [],
    exerciseCatalogItems: [],
    favoriteMeals: [],
    healthEvents: [],
    healthTemplates: [],
    sobrietyEvents: [],
    assessmentResults: [],
    importBatches: [],
    importArtifacts: [],
    reviewSnapshots: [],
    adherenceMatches: [],
  };
}

function createStorage() {
  return new Map<TableName, Map<string, Record<string, unknown>>>(
    Object.keys(drizzleSchema).map((tableName) => [tableName as TableName, new Map()])
  );
}

function cloneStorage(storage: ReturnType<typeof createStorage>) {
  return new Map(
    [...storage.entries()].map(([tableName, rows]) => [tableName, new Map(rows.entries())])
  ) as ReturnType<typeof createStorage>;
}

function resolveTableName(table: unknown): TableName {
  const entry = (Object.entries(drizzleSchema) as Array<[TableName, unknown]>).find(
    ([, candidate]) => candidate === table
  );

  if (!entry) {
    throw new Error('Unknown table reference');
  }

  return entry[0];
}

function createFakeDb(options?: { failOnInsert?: { tableName: TableName; id: string } }) {
  let storage = createStorage();

  function createDbView(target: ReturnType<typeof createStorage>) {
    return {
      insert(table: unknown) {
        const tableName = resolveTableName(table);
        const tableRows = target.get(tableName)!;

        return {
          values(payloads: Record<string, unknown>[] | Record<string, unknown>) {
            const rows = Array.isArray(payloads) ? payloads : [payloads];

            return {
              onConflictDoUpdate() {
                for (const row of rows) {
                  if (
                    options?.failOnInsert?.tableName === tableName &&
                    options.failOnInsert.id === String(row.id)
                  ) {
                    throw new Error(`Forced failure for ${tableName}:${String(row.id)}`);
                  }

                  tableRows.set(String(row.id), row);
                }

                return Promise.resolve();
              },
            };
          },
        };
      },
    };
  }

  const db = {
    ...createDbView(storage),
    async transaction<T>(callback: (tx: ReturnType<typeof createDbView>) => Promise<T> | T) {
      const transactionalStorage = cloneStorage(storage);
      const tx = createDbView(transactionalStorage);
      const result = await callback(tx);
      storage = transactionalStorage;
      return result;
    },
  };

  return {
    db,
    count(tableName: TableName) {
      return storage.get(tableName)!.size;
    },
  };
}

describe('importHealthDbSnapshot', () => {
  it('allows replaying the same snapshot without duplicating rows', async () => {
    const fakeDb = createFakeDb();
    const snapshot = createSnapshot();
    snapshot.dailyRecords.push({
      id: 'daily:2026-04-20',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-20T08:00:00.000Z',
      date: '2026-04-20',
      mood: 4,
      energy: 3,
      stress: 2,
      focus: 4,
      sleepHours: 7,
      sleepQuality: 4,
    });

    await importHealthDbSnapshot(fakeDb.db as never, snapshot);
    await expect(importHealthDbSnapshot(fakeDb.db as never, snapshot)).resolves.toBeUndefined();

    expect(fakeDb.count('dailyRecords')).toBe(1);
  });

  it('rolls back earlier inserts when a later table conflicts', async () => {
    const fakeDb = createFakeDb({
      failOnInsert: {
        tableName: 'foodEntries',
        id: 'food-entry-1',
      },
    });

    const conflictingSnapshot = createSnapshot();
    conflictingSnapshot.dailyRecords.push({
      id: 'daily:2026-04-21',
      createdAt: '2026-04-21T08:00:00.000Z',
      updatedAt: '2026-04-21T08:00:00.000Z',
      date: '2026-04-21',
      mood: 4,
      energy: 3,
      stress: 2,
      focus: 4,
      sleepHours: 7,
      sleepQuality: 4,
    });
    conflictingSnapshot.foodEntries.push({
      id: 'food-entry-1',
      createdAt: '2026-04-21T09:00:00.000Z',
      updatedAt: '2026-04-21T09:00:00.000Z',
      localDay: '2026-04-21',
      mealType: 'lunch',
      name: 'Conflicting meal',
    });

    await expect(importHealthDbSnapshot(fakeDb.db as never, conflictingSnapshot)).rejects.toThrow();

    expect(fakeDb.count('dailyRecords')).toBe(0);
  });
});
