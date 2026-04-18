import { rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { DB_VERSION, SCHEMA_STORES } from '$lib/core/db/schema';
import { drizzleSchema } from './schema';
import {
  assertPlaywrightModeForDbReset,
  isPlaywrightMode,
  PlaywrightModeRequiredError,
} from './reset-guard';

const DEFAULT_DB_PATH = join(process.cwd(), '.data', 'personal-health-cockpit.sqlite');
const PLAYWRIGHT_DB_PATH = '/tmp/personal-health-cockpit-playwright.sqlite';

const globalState = globalThis as typeof globalThis & {
  __healthDrizzleClient?: ReturnType<typeof createDrizzleSqliteClient> | null;
};

export { assertPlaywrightModeForDbReset, PlaywrightModeRequiredError };

function indexedColumnsForTable(tableName: keyof typeof SCHEMA_STORES): string[] {
  return SCHEMA_STORES[tableName]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function resolveHealthDbPath(): string {
  const filename = process.env.HEALTH_DB_PATH ?? DEFAULT_DB_PATH;
  if (isPlaywrightMode() && filename === DEFAULT_DB_PATH) {
    return PLAYWRIGHT_DB_PATH;
  }
  return filename === ':memory:' ? filename : resolve(filename);
}

export function deleteHealthDbFiles(filename = resolveHealthDbPath()): void {
  if (filename === ':memory:') return;
  for (const suffix of ['', '-shm', '-wal']) {
    rmSync(`${filename}${suffix}`, { force: true });
  }
}

export function applySqlitePragmas(sqlite: Database): void {
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
}

export function ensureSqliteMirrorSchema(sqlite: Database): void {
  sqlite.exec('DROP TABLE IF EXISTS plannedMeals');

  for (const tableName of Object.keys(SCHEMA_STORES) as Array<keyof typeof SCHEMA_STORES>) {
    const indexedColumns = indexedColumnsForTable(tableName);
    const columnSql = indexedColumns
      .filter((column) => column !== 'id')
      .map((column) => `${column} TEXT`)
      .join(', ');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        ${columnSql ? `${columnSql},` : ''}
        record_json TEXT NOT NULL
      ) STRICT;
    `);

    for (const column of indexedColumns) {
      if (column === 'id') continue;
      sqlite.exec(
        `CREATE INDEX IF NOT EXISTS idx_${tableName}_${column} ON ${tableName} (${column})`
      );
    }
  }

  sqlite.exec(`PRAGMA user_version = ${DB_VERSION}`);
}

export function createDrizzleSqliteClient(filename = resolveHealthDbPath()) {
  const sqlite = new Database(filename, {
    create: true,
    readwrite: true,
  });

  applySqlitePragmas(sqlite);
  ensureSqliteMirrorSchema(sqlite);

  return {
    sqlite,
    db: drizzle({ client: sqlite, schema: drizzleSchema }),
  };
}

export function getServerDrizzleClient() {
  if (!globalState.__healthDrizzleClient) {
    globalState.__healthDrizzleClient = createDrizzleSqliteClient();
  }
  return globalState.__healthDrizzleClient;
}

export function resetServerDrizzleClient(): void {
  if (!globalState.__healthDrizzleClient) return;
  globalState.__healthDrizzleClient.sqlite.close(false);
  globalState.__healthDrizzleClient = null;
}

export function resetServerDrizzleStorage(): void {
  assertPlaywrightModeForDbReset();
  resetServerDrizzleClient();
  deleteHealthDbFiles();
}
