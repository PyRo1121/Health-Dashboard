import type { HealthDatabase } from '$lib/core/db/types';
import type { SobrietyEvent } from '$lib/core/domain/types';
import {
	buildSobrietyTrendSummary,
	logCravingEvent,
	logLapseEvent,
	setSobrietyStatusForDay
} from '$lib/features/sobriety/service';

export interface SobrietyPageState {
	loading: boolean;
	localDay: string;
	summary: { streak: number; todayEvents: SobrietyEvent[] };
	saveNotice: string;
	cravingScore: string;
	cravingNote: string;
	lapseNote: string;
	recoveryAction: string;
}

export function createSobrietyPageState(): SobrietyPageState {
	return {
		loading: true,
		localDay: '',
		summary: { streak: 0, todayEvents: [] },
		saveNotice: '',
		cravingScore: '3',
		cravingNote: '',
		lapseNote: '',
		recoveryAction: ''
	};
}

export async function loadSobrietyPage(
	db: HealthDatabase,
	localDay: string,
	state: SobrietyPageState
): Promise<SobrietyPageState> {
	const summary = await buildSobrietyTrendSummary(db, localDay);
	return {
		...state,
		loading: false,
		localDay,
		summary
	};
}

async function reloadSobrietyPageState(
	db: HealthDatabase,
	state: SobrietyPageState,
	overrides: Partial<SobrietyPageState> = {}
): Promise<SobrietyPageState> {
	const next = await loadSobrietyPage(db, state.localDay, state);
	return {
		...next,
		...overrides
	};
}

export async function markSobrietyStatus(
	db: HealthDatabase,
	state: SobrietyPageState,
	status: 'sober' | 'recovery',
	notice: string
): Promise<SobrietyPageState> {
	await setSobrietyStatusForDay(db, { localDay: state.localDay, status });
	return await reloadSobrietyPageState(db, state, {
		saveNotice: notice
	});
}

export async function saveSobrietyCraving(
	db: HealthDatabase,
	state: SobrietyPageState
): Promise<SobrietyPageState> {
	await logCravingEvent(db, {
		localDay: state.localDay,
		cravingScore: Number(state.cravingScore),
		note: state.cravingNote.trim()
	});
	return await reloadSobrietyPageState(db, state, {
		saveNotice: 'Craving logged.',
		cravingNote: ''
	});
}

export async function saveSobrietyLapse(
	db: HealthDatabase,
	state: SobrietyPageState
): Promise<SobrietyPageState> {
	await logLapseEvent(db, {
		localDay: state.localDay,
		note: state.lapseNote.trim(),
		recoveryAction: state.recoveryAction.trim()
	});
	return await reloadSobrietyPageState(db, state, {
		saveNotice: 'Lapse context logged.'
	});
}
