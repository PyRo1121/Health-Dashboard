import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { SobrietyEvent } from '$lib/core/domain/types';
import { upsertDailyRecord } from '$lib/core/shared/daily-records';
import { createRecordMeta } from '$lib/core/shared/records';

function buildSobrietyEvent(input: {
	id: string;
	localDay: string;
	eventType: SobrietyEvent['eventType'];
	status?: SobrietyEvent['status'];
	cravingScore?: number;
	triggerTags?: string[];
	recoveryAction?: string;
	note?: string;
}): SobrietyEvent {
	const timestamp = nowIso();

	return {
		...createRecordMeta(input.id, timestamp),
		localDay: input.localDay,
		eventType: input.eventType,
		status: input.status,
		cravingScore: input.cravingScore,
		triggerTags: input.triggerTags ? [...input.triggerTags] : undefined,
		recoveryAction: input.recoveryAction,
		note: input.note
	};
}

export async function setSobrietyStatusForDay(
	db: HealthDatabase,
	input: { localDay: string; status: 'sober' | 'lapse' | 'recovery'; note?: string }
): Promise<SobrietyEvent> {
	const event = buildSobrietyEvent({
		id: `sobriety:status:${input.localDay}`,
		localDay: input.localDay,
		eventType: 'status',
		status: input.status,
		note: input.note
	});

	await db.sobrietyEvents.put(event);
	await upsertDailyRecord(db, input.localDay, { sobrietyStatus: input.status });
	return event;
}

export async function logCravingEvent(
	db: HealthDatabase,
	input: { localDay: string; cravingScore: number; triggerTags?: string[]; note?: string }
): Promise<SobrietyEvent> {
	const event = buildSobrietyEvent({
		id: `sobriety:craving:${input.localDay}:${crypto.randomUUID()}`,
		localDay: input.localDay,
		eventType: 'craving',
		cravingScore: input.cravingScore,
		triggerTags: [...(input.triggerTags ?? [])],
		note: input.note
	});

	await db.sobrietyEvents.put(event);
	await upsertDailyRecord(db, input.localDay, { cravingScore: input.cravingScore });
	return event;
}

export async function logLapseEvent(
	db: HealthDatabase,
	input: { localDay: string; note: string; triggerTags?: string[]; recoveryAction?: string }
): Promise<SobrietyEvent> {
	const event = buildSobrietyEvent({
		id: `sobriety:lapse:${input.localDay}:${crypto.randomUUID()}`,
		localDay: input.localDay,
		eventType: 'lapse',
		status: 'lapse',
		triggerTags: input.triggerTags ?? [],
		recoveryAction: input.recoveryAction,
		note: input.note
	});

	await db.sobrietyEvents.put(event);
	await upsertDailyRecord(db, input.localDay, { sobrietyStatus: 'lapse' });
	return event;
}

export async function listSobrietyEventsForDay(db: HealthDatabase, localDay: string): Promise<SobrietyEvent[]> {
	const events = await db.sobrietyEvents.where('localDay').equals(localDay).toArray();
	return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function calculateCurrentStreak(db: HealthDatabase, asOfDay: string): Promise<number> {
	const statusEvents = await db.sobrietyEvents.where('eventType').equals('status').toArray();
	const statusByDay = new Map(
		statusEvents
			.sort((a, b) => a.localDay.localeCompare(b.localDay))
			.map((event) => [event.localDay, event.status ?? 'lapse'])
	);

	let streak = 0;
	const cursor = new Date(`${asOfDay}T00:00:00Z`);

	while (true) {
		const day = cursor.toISOString().slice(0, 10);
		if (statusByDay.get(day) !== 'sober') break;
		streak += 1;
		cursor.setUTCDate(cursor.getUTCDate() - 1);
	}

	return streak;
}

export async function buildSobrietyTrendSummary(
	db: HealthDatabase,
	asOfDay: string
): Promise<{ streak: number; todayEvents: SobrietyEvent[] }> {
	const [streak, todayEvents] = await Promise.all([
		calculateCurrentStreak(db, asOfDay),
		listSobrietyEventsForDay(db, asOfDay)
	]);

	return { streak, todayEvents };
}
