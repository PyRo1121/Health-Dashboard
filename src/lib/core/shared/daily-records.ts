import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { DailyRecord } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';

export async function upsertDailyRecord(
	db: HealthDatabase,
	date: string,
	patch: Partial<DailyRecord>
): Promise<DailyRecord> {
	const existing = await db.dailyRecords.where('date').equals(date).first();
	const timestamp = nowIso();

	const record: DailyRecord = {
		...existing,
		...updateRecordMeta(existing, `daily:${date}`, timestamp),
		date,
		...patch
	};

	await db.dailyRecords.put(record);
	return record;
}
