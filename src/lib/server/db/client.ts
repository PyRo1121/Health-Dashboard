import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import type { BaseRecord } from '$lib/core/domain/types';
import { DB_NAME, DB_VERSION, SCHEMA_STORES } from '$lib/core/db/schema';
import type { HealthDatabase, HealthDbQuery, HealthDbTable } from '$lib/core/db/types';

const TABLE_NAMES = Object.keys(SCHEMA_STORES) as Array<keyof typeof SCHEMA_STORES>;
const DEFAULT_DB_PATH = join(process.cwd(), '.data', `${DB_NAME}.sqlite`);
const PLAYWRIGHT_DB_PATH = '/tmp/personal-health-cockpit-playwright.sqlite';
export const PLAYWRIGHT_MODE_FLAG = join(process.cwd(), '.playwright-mode');

function isPlaywrightMode(): boolean {
  return existsSync(PLAYWRIGHT_MODE_FLAG);
}

function parseIndexedColumns(storeDefinition: string): string[] {
  return storeDefinition
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function serializeColumnValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value);
}

function compareRecords<T>(left: T, right: T): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function sortRecords<T, Key extends keyof T & string>(records: T[], field: Key): T[] {
  return [...records].sort((left, right) => compareRecords(left[field], right[field]));
}

class ArrayQuery<T> implements HealthDbQuery<T> {
  constructor(private readonly loadRecords: () => Promise<T[]>) {}

  async first(): Promise<T | undefined> {
    return (await this.loadRecords())[0];
  }

  async toArray(): Promise<T[]> {
    return await this.loadRecords();
  }

  async sortBy<Key extends keyof T & string>(field: Key): Promise<T[]> {
    return sortRecords(await this.loadRecords(), field);
  }

  and(predicate: (record: T) => boolean): HealthDbQuery<T> {
    return new ArrayQuery(async () => (await this.loadRecords()).filter(predicate));
  }
}

class SqliteTable<T extends BaseRecord> implements HealthDbTable<T> {
  private readonly insertStatement;
  private readonly getStatement;
  private readonly deleteStatement;
  private readonly listStatement;

  constructor(
    private readonly db: Database,
    private readonly tableName: string,
    private readonly indexedColumns: string[]
  ) {
    const columns = [
      'id',
      ...this.indexedColumns.filter((column) => column !== 'id'),
      'record_json',
    ];
    const placeholders = columns.map((column) => `$${column}`).join(', ');
    const updates = columns
      .filter((column) => column !== 'id')
      .map((column) => `${column} = excluded.${column}`)
      .join(', ');

    this.insertStatement = this.db.query(
      `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders}) ` +
        `ON CONFLICT(id) DO UPDATE SET ${updates}`
    );
    this.getStatement = this.db.query(`SELECT record_json FROM ${this.tableName} WHERE id = $id`);
    this.deleteStatement = this.db.query(`DELETE FROM ${this.tableName} WHERE id = $id`);
    this.listStatement = this.db.query(`SELECT record_json FROM ${this.tableName}`);
  }

  private serializeRecord(record: T): Record<string, string | null> {
    const payload: Record<string, string | null> = {
      $id: record.id,
      $record_json: JSON.stringify(record),
    };

    for (const column of this.indexedColumns) {
      if (column === 'id') continue;
      payload[`$${column}`] = serializeColumnValue(record[column as keyof T]);
    }

    return payload;
  }

  private deserializeRow(row: { record_json: string }): T {
    return JSON.parse(row.record_json) as T;
  }

  async put(record: T): Promise<string> {
    this.insertStatement.run(this.serializeRecord(record));
    return record.id;
  }

  async bulkAdd(records: T[]): Promise<void> {
    const insertMany = this.db.transaction((batch: T[]) => {
      for (const record of batch) {
        this.insertStatement.run(this.serializeRecord(record));
      }
    });

    insertMany(records);
  }

  async get(id: string): Promise<T | undefined> {
    const row = this.getStatement.get({ $id: id }) as { record_json: string } | undefined;
    return row ? this.deserializeRow(row) : undefined;
  }

  async delete(id: string): Promise<void> {
    this.deleteStatement.run({ $id: id });
  }

  async toArray(): Promise<T[]> {
    return (this.listStatement.all() as Array<{ record_json: string }>).map((row) =>
      this.deserializeRow(row)
    );
  }

  where<Key extends keyof T & string>(field: Key) {
    const statement = this.db.query(
      `SELECT record_json FROM ${this.tableName} WHERE ${String(field)} = $value`
    );

    return {
      equals: (value: T[Key]): HealthDbQuery<T> =>
        new ArrayQuery(async () =>
          (
            statement.all({
              $value: serializeColumnValue(value),
            }) as Array<{ record_json: string }>
          ).map((row) => this.deserializeRow(row))
        ),
    };
  }
}

function ensureSqliteSchema(db: Database): void {
  db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA synchronous = NORMAL;
		PRAGMA foreign_keys = ON;
		PRAGMA busy_timeout = 5000;
	`);

  for (const tableName of TABLE_NAMES) {
    const indexedColumns = parseIndexedColumns(SCHEMA_STORES[tableName]);
    const columnSql = indexedColumns
      .filter((column) => column !== 'id')
      .map((column) => `${column} TEXT`)
      .join(', ');

    db.exec(`
			CREATE TABLE IF NOT EXISTS ${tableName} (
				id TEXT PRIMARY KEY,
				${columnSql ? `${columnSql},` : ''}
				record_json TEXT NOT NULL
			) STRICT;
		`);

    for (const column of indexedColumns) {
      if (column === 'id') continue;
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_${column} ON ${tableName} (${column})`);
    }
  }

  db.exec(`PRAGMA user_version = ${DB_VERSION}`);
}

function createTableMap(
  database: Database
): Pick<
  HealthDatabase,
  | 'dailyRecords'
  | 'journalEntries'
  | 'foodEntries'
  | 'foodCatalogItems'
  | 'recipeCatalogItems'
  | 'plannedMeals'
  | 'weeklyPlans'
  | 'planSlots'
  | 'groceryItems'
  | 'workoutTemplates'
  | 'exerciseCatalogItems'
  | 'favoriteMeals'
  | 'healthEvents'
  | 'healthTemplates'
  | 'sobrietyEvents'
  | 'assessmentResults'
  | 'importBatches'
  | 'importArtifacts'
  | 'reviewSnapshots'
  | 'adherenceMatches'
> {
  return {
    dailyRecords: new SqliteTable(
      database,
      'dailyRecords',
      parseIndexedColumns(SCHEMA_STORES.dailyRecords)
    ),
    journalEntries: new SqliteTable(
      database,
      'journalEntries',
      parseIndexedColumns(SCHEMA_STORES.journalEntries)
    ),
    foodEntries: new SqliteTable(
      database,
      'foodEntries',
      parseIndexedColumns(SCHEMA_STORES.foodEntries)
    ),
    foodCatalogItems: new SqliteTable(
      database,
      'foodCatalogItems',
      parseIndexedColumns(SCHEMA_STORES.foodCatalogItems)
    ),
    recipeCatalogItems: new SqliteTable(
      database,
      'recipeCatalogItems',
      parseIndexedColumns(SCHEMA_STORES.recipeCatalogItems)
    ),
    plannedMeals: new SqliteTable(
      database,
      'plannedMeals',
      parseIndexedColumns(SCHEMA_STORES.plannedMeals)
    ),
    weeklyPlans: new SqliteTable(
      database,
      'weeklyPlans',
      parseIndexedColumns(SCHEMA_STORES.weeklyPlans)
    ),
    planSlots: new SqliteTable(database, 'planSlots', parseIndexedColumns(SCHEMA_STORES.planSlots)),
    groceryItems: new SqliteTable(
      database,
      'groceryItems',
      parseIndexedColumns(SCHEMA_STORES.groceryItems)
    ),
    workoutTemplates: new SqliteTable(
      database,
      'workoutTemplates',
      parseIndexedColumns(SCHEMA_STORES.workoutTemplates)
    ),
    exerciseCatalogItems: new SqliteTable(
      database,
      'exerciseCatalogItems',
      parseIndexedColumns(SCHEMA_STORES.exerciseCatalogItems)
    ),
    favoriteMeals: new SqliteTable(
      database,
      'favoriteMeals',
      parseIndexedColumns(SCHEMA_STORES.favoriteMeals)
    ),
    healthEvents: new SqliteTable(
      database,
      'healthEvents',
      parseIndexedColumns(SCHEMA_STORES.healthEvents)
    ),
    healthTemplates: new SqliteTable(
      database,
      'healthTemplates',
      parseIndexedColumns(SCHEMA_STORES.healthTemplates)
    ),
    sobrietyEvents: new SqliteTable(
      database,
      'sobrietyEvents',
      parseIndexedColumns(SCHEMA_STORES.sobrietyEvents)
    ),
    assessmentResults: new SqliteTable(
      database,
      'assessmentResults',
      parseIndexedColumns(SCHEMA_STORES.assessmentResults)
    ),
    importBatches: new SqliteTable(
      database,
      'importBatches',
      parseIndexedColumns(SCHEMA_STORES.importBatches)
    ),
    importArtifacts: new SqliteTable(
      database,
      'importArtifacts',
      parseIndexedColumns(SCHEMA_STORES.importArtifacts)
    ),
    reviewSnapshots: new SqliteTable(
      database,
      'reviewSnapshots',
      parseIndexedColumns(SCHEMA_STORES.reviewSnapshots)
    ),
    adherenceMatches: new SqliteTable(
      database,
      'adherenceMatches',
      parseIndexedColumns(SCHEMA_STORES.adherenceMatches)
    ),
  };
}

function resolveDbPath(filename = process.env.HEALTH_DB_PATH ?? DEFAULT_DB_PATH): string {
  if (isPlaywrightMode() && filename === DEFAULT_DB_PATH) {
    return PLAYWRIGHT_DB_PATH;
  }

  return filename === ':memory:' ? filename : resolve(filename);
}

function deleteDbFiles(filename: string): void {
  if (filename === ':memory:') return;
  for (const suffix of ['', '-shm', '-wal']) {
    rmSync(`${filename}${suffix}`, { force: true });
  }
}

export function createServerHealthDb(filename?: string): HealthDatabase {
  const resolvedPath = resolveDbPath(filename);
  if (resolvedPath !== ':memory:') {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }

  const sqlite = new Database(resolvedPath, { create: true, readwrite: true });
  ensureSqliteSchema(sqlite);
  const tables = createTableMap(sqlite);

  return {
    ...tables,
    close() {
      sqlite.close(false);
    },
    async delete() {
      sqlite.close(false);
      deleteDbFiles(resolvedPath);
    },
  };
}

const globalState = globalThis as typeof globalThis & {
  __healthServerDb?: HealthDatabase | null;
};

export function getServerHealthDb(): HealthDatabase {
  if (!globalState.__healthServerDb) {
    globalState.__healthServerDb = createServerHealthDb();
  }

  return globalState.__healthServerDb;
}

export async function resetServerHealthDb(): Promise<void> {
  if (isPlaywrightMode()) {
    if (globalState.__healthServerDb) {
      await globalState.__healthServerDb.delete();
      globalState.__healthServerDb = null;
    }
    deleteDbFiles(PLAYWRIGHT_DB_PATH);
    return;
  }

  if (!globalState.__healthServerDb) {
    deleteDbFiles(resolveDbPath());
    return;
  }

  await globalState.__healthServerDb.delete();
  globalState.__healthServerDb = null;
}

export async function withServerHealthDb<T>(
  run: (db: HealthDatabase) => Promise<T> | T
): Promise<T> {
  if (isPlaywrightMode()) {
    const db = createServerHealthDb(resolveDbPath());
    try {
      return await run(db);
    } finally {
      db.close();
    }
  }

  return await run(getServerHealthDb());
}
