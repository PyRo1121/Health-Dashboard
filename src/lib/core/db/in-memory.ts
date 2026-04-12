import type { BaseRecord } from '$lib/core/domain/types';
import type { HealthDbLifecycle, HealthDbQuery, HealthDbStores, HealthDbTable } from './types';

type InMemoryHealthDb = HealthDbStores & HealthDbLifecycle;
type InMemoryStoreName = keyof HealthDbStores;
type InMemoryStoreRecord<Name extends InMemoryStoreName> =
  HealthDbStores[Name] extends HealthDbTable<infer T> ? T : never;

function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return -1;
  if (right === undefined || right === null) return 1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right));
}

function sortRecords<T, Key extends keyof T & string>(records: T[], field: Key): T[] {
  return [...records].sort((left, right) => compareValues(left[field], right[field]));
}

class ArrayQuery<T> implements HealthDbQuery<T> {
  constructor(private readonly loadRecords: () => T[]) {}

  async first(): Promise<T | undefined> {
    return this.loadRecords()[0];
  }

  async toArray(): Promise<T[]> {
    return this.loadRecords();
  }

  async count(): Promise<number> {
    return this.loadRecords().length;
  }

  async sortBy<Key extends keyof T & string>(field: Key): Promise<T[]> {
    return sortRecords(this.loadRecords(), field);
  }

  and(predicate: (record: T) => boolean): HealthDbQuery<T> {
    return new ArrayQuery(() => this.loadRecords().filter(predicate));
  }
}

function createTimestampNormalizer() {
  let lastTimestampMs = 0;

  return <T extends BaseRecord>(record: T, isNew: boolean): T => {
    const next = structuredClone(record);
    const createdAtMs = Date.parse(next.createdAt);
    const updatedAtMs = Date.parse(next.updatedAt);
    const baseMs = Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now();
    const normalizedMs = baseMs <= lastTimestampMs ? lastTimestampMs + 1 : baseMs;
    lastTimestampMs = normalizedMs;
    const normalizedIso = new Date(normalizedMs).toISOString();

    next.updatedAt = normalizedIso;
    if (isNew) {
      next.createdAt = normalizedIso;
    } else if (!Number.isFinite(createdAtMs) || createdAtMs > normalizedMs) {
      next.createdAt = normalizedIso;
    }

    return next;
  };
}

class MemoryTable<T extends BaseRecord> implements HealthDbTable<T> {
  constructor(
    private readonly records: Map<string, T>,
    private readonly normalizeRecord: (record: T, isNew: boolean) => T
  ) {}

  async put(record: T): Promise<string> {
    const isNew = !this.records.has(record.id);
    this.records.set(record.id, this.normalizeRecord(record, isNew));
    return record.id;
  }

  async bulkAdd(records: readonly T[]): Promise<unknown> {
    for (const record of records) {
      await this.put(record);
    }
    return undefined;
  }

  async bulkPut(records: readonly T[]): Promise<unknown> {
    return this.bulkAdd(records);
  }

  async get(id: string): Promise<T | undefined> {
    const record = this.records.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  async toArray(): Promise<T[]> {
    return [...this.records.values()].map((record) => structuredClone(record));
  }

  async count(): Promise<number> {
    return this.records.size;
  }

  where<Key extends keyof T & string>(field: Key) {
    return {
      equals: (value: T[Key]): HealthDbQuery<T> =>
        new ArrayQuery(() =>
          [...this.records.values()]
            .filter((record) => record[field] === value)
            .map((record) => structuredClone(record))
        ),
    };
  }
}

function createTable<T extends BaseRecord>(
  normalizeRecord: (record: T, isNew: boolean) => T
): MemoryTable<T> {
  return new MemoryTable<T>(new Map<string, T>(), normalizeRecord);
}

export function createInMemoryHealthDb(): InMemoryHealthDb {
  const normalizeRecord = createTimestampNormalizer();
  const tables = {
    dailyRecords: createTable<InMemoryStoreRecord<'dailyRecords'>>(normalizeRecord),
    journalEntries: createTable<InMemoryStoreRecord<'journalEntries'>>(normalizeRecord),
    foodEntries: createTable<InMemoryStoreRecord<'foodEntries'>>(normalizeRecord),
    foodCatalogItems: createTable<InMemoryStoreRecord<'foodCatalogItems'>>(normalizeRecord),
    recipeCatalogItems: createTable<InMemoryStoreRecord<'recipeCatalogItems'>>(normalizeRecord),
    weeklyPlans: createTable<InMemoryStoreRecord<'weeklyPlans'>>(normalizeRecord),
    planSlots: createTable<InMemoryStoreRecord<'planSlots'>>(normalizeRecord),
    derivedGroceryItems: createTable<InMemoryStoreRecord<'derivedGroceryItems'>>(normalizeRecord),
    manualGroceryItems: createTable<InMemoryStoreRecord<'manualGroceryItems'>>(normalizeRecord),
    workoutTemplates: createTable<InMemoryStoreRecord<'workoutTemplates'>>(normalizeRecord),
    exerciseCatalogItems: createTable<InMemoryStoreRecord<'exerciseCatalogItems'>>(normalizeRecord),
    favoriteMeals: createTable<InMemoryStoreRecord<'favoriteMeals'>>(normalizeRecord),
    healthEvents: createTable<InMemoryStoreRecord<'healthEvents'>>(normalizeRecord),
    healthTemplates: createTable<InMemoryStoreRecord<'healthTemplates'>>(normalizeRecord),
    sobrietyEvents: createTable<InMemoryStoreRecord<'sobrietyEvents'>>(normalizeRecord),
    assessmentResults: createTable<InMemoryStoreRecord<'assessmentResults'>>(normalizeRecord),
    importBatches: createTable<InMemoryStoreRecord<'importBatches'>>(normalizeRecord),
    importArtifacts: createTable<InMemoryStoreRecord<'importArtifacts'>>(normalizeRecord),
    reviewSnapshots: createTable<InMemoryStoreRecord<'reviewSnapshots'>>(normalizeRecord),
    adherenceMatches: createTable<InMemoryStoreRecord<'adherenceMatches'>>(normalizeRecord),
  } satisfies Record<InMemoryStoreName, HealthDbTable<BaseRecord>>;

  return {
    ...tables,
    close() {},
    async delete() {
      for (const table of Object.values(tables)) {
        for (const record of await table.toArray()) {
          await table.delete(record.id);
        }
      }
    },
  } satisfies InMemoryHealthDb;
}
