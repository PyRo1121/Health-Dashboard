import type { HealthDbDailyRecordsStore } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { DailyRecord } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';

export type DailyRecordsStore = HealthDbDailyRecordsStore;

export async function upsertDailyRecord(
  store: DailyRecordsStore,
  date: string,
  patch: Partial<DailyRecord>
): Promise<DailyRecord> {
  const existing = await store.dailyRecords.where('date').equals(date).first();
  const timestamp = nowIso();

  const record: DailyRecord = {
    ...existing,
    ...updateRecordMeta(existing, `daily:${date}`, timestamp),
    date,
    ...patch,
  };

  await store.dailyRecords.put(record);
  return record;
}
