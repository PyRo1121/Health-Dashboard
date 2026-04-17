import { desc, eq, inArray } from 'drizzle-orm';
import type { createDrizzleSqliteClient } from './client';
import { SCHEMA_STORES } from '$lib/core/db/schema';

type DrizzleDb = ReturnType<typeof createDrizzleSqliteClient>['db'];
type DrizzleWriteDb = Pick<DrizzleDb, 'insert'>;

function asTable(table: unknown): Record<string, unknown> {
  return table as Record<string, unknown>;
}

export function serializeColumnValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value);
}

export function indexedColumnsForTable(tableName: keyof typeof SCHEMA_STORES): string[] {
  return SCHEMA_STORES[tableName]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function toMirrorInsertRecord<T extends { id: string }>(
  tableName: keyof typeof SCHEMA_STORES,
  record: T
): Record<string, string | null> {
  const payload: Record<string, string | null> = {
    id: record.id,
    recordJson: JSON.stringify(record),
  };

  for (const column of indexedColumnsForTable(tableName)) {
    if (column === 'id') continue;
    payload[column] = serializeColumnValue(record[column as keyof T]);
  }

  return payload;
}

export function deserializeMirrorRows<T>(rows: Array<{ recordJson: string }>): T[] {
  return rows.map((row) => JSON.parse(row.recordJson) as T);
}

export async function upsertMirrorRecord<T extends { id: string }>(
  db: DrizzleDb,
  tableName: keyof typeof SCHEMA_STORES,
  table: unknown,
  record: T
): Promise<void> {
  const payload = toMirrorInsertRecord(tableName, record);
  const t = asTable(table);
  await db
    .insert(table as never)
    .values(payload as never)
    .onConflictDoUpdate({
      target: t.id as never,
      set: payload as never,
    });
}

export function upsertMirrorRecordSync<T extends { id: string }>(
  db: DrizzleWriteDb,
  tableName: keyof typeof SCHEMA_STORES,
  table: unknown,
  record: T
): void {
  const payload = toMirrorInsertRecord(tableName, record);
  const t = asTable(table);
  db
    .insert(table as never)
    .values(payload as never)
    .onConflictDoUpdate({
      target: t.id as never,
      set: payload as never,
    })
    .run();
}

export async function upsertMirrorRecords<T extends { id: string }>(
  db: DrizzleDb,
  tableName: keyof typeof SCHEMA_STORES,
  table: unknown,
  records: readonly T[]
): Promise<void> {
  for (const record of records) {
    await upsertMirrorRecord(db, tableName, table, record);
  }
}

export function upsertMirrorRecordsSync<T extends { id: string }>(
  db: DrizzleWriteDb,
  tableName: keyof typeof SCHEMA_STORES,
  table: unknown,
  records: readonly T[]
): void {
  for (const record of records) {
    upsertMirrorRecordSync(db, tableName, table, record);
  }
}

export async function selectAllMirrorRecords<T>(db: DrizzleDb, table: unknown): Promise<T[]> {
  const t = asTable(table);
  const rows = await db.select({ recordJson: t.recordJson as never }).from(table as never);
  return deserializeMirrorRows<T>(rows as Array<{ recordJson: string }>);
}

export async function selectMirrorRecordById<T>(
  db: DrizzleDb,
  table: unknown,
  id: string
): Promise<T | undefined> {
  const t = asTable(table);
  const rows = await db
    .select({ recordJson: t.recordJson as never })
    .from(table as never)
    .where(eq(t.id as never, id))
    .limit(1);
  return deserializeMirrorRows<T>(rows as Array<{ recordJson: string }>)[0];
}

export async function selectMirrorRecordsByField<T>(
  db: DrizzleDb,
  table: unknown,
  field: string,
  value: unknown
): Promise<T[]> {
  const t = asTable(table);
  const rows = await db
    .select({ recordJson: t.recordJson as never })
    .from(table as never)
    .where(eq(t[field] as never, serializeColumnValue(value)));
  return deserializeMirrorRows<T>(rows as Array<{ recordJson: string }>);
}

export async function selectMirrorRecordsByFieldValues<T>(
  db: DrizzleDb,
  table: unknown,
  field: string,
  values: unknown[]
): Promise<T[]> {
  const normalized = [
    ...new Set(values.map(serializeColumnValue).filter((value) => value !== null)),
  ];
  if (!normalized.length) return [];

  const t = asTable(table);
  const rows = await db
    .select({ recordJson: t.recordJson as never })
    .from(table as never)
    .where(inArray(t[field] as never, normalized));
  return deserializeMirrorRows<T>(rows as Array<{ recordJson: string }>);
}

export async function selectAllMirrorRecordsDesc<T>(
  db: DrizzleDb,
  table: unknown,
  field: string
): Promise<T[]> {
  const t = asTable(table);
  const rows = await db
    .select({ recordJson: t.recordJson as never })
    .from(table as never)
    .orderBy(desc(t[field] as never));
  return deserializeMirrorRows<T>(rows as Array<{ recordJson: string }>);
}
