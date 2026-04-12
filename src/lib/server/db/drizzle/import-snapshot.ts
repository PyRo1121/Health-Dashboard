import type { createDrizzleSqliteClient } from './client';
import type { HealthDbSnapshot } from '$lib/core/db/types';
import { drizzleSchema } from './schema';
import { toMirrorInsertRecord } from './mirror';

type DrizzleDb = ReturnType<typeof createDrizzleSqliteClient>['db'];

const SNAPSHOT_TABLES = [
  'dailyRecords',
  'journalEntries',
  'foodEntries',
  'foodCatalogItems',
  'recipeCatalogItems',
  'weeklyPlans',
  'planSlots',
  'derivedGroceryItems',
  'manualGroceryItems',
  'workoutTemplates',
  'exerciseCatalogItems',
  'favoriteMeals',
  'healthEvents',
  'healthTemplates',
  'sobrietyEvents',
  'assessmentResults',
  'importBatches',
  'importArtifacts',
  'reviewSnapshots',
  'adherenceMatches',
] as const satisfies ReadonlyArray<keyof HealthDbSnapshot>;

export async function importHealthDbSnapshot(
  db: DrizzleDb,
  snapshot: HealthDbSnapshot
): Promise<void> {
  for (const tableName of SNAPSHOT_TABLES) {
    const records = snapshot[tableName] ?? [];
    if (!records.length) continue;

    await db
      .insert((drizzleSchema as Record<string, unknown>)[tableName] as never)
      .values(
        records.map((record) => toMirrorInsertRecord(tableName, record as { id: string })) as never
      );
  }
}

export function countMigratedRecords(snapshot: HealthDbSnapshot): number {
  return SNAPSHOT_TABLES.reduce(
    (total, tableName) => total + (snapshot[tableName]?.length ?? 0),
    0
  );
}
