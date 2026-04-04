import type { HealthDatabase } from '$lib/core/db/types';
import type { JournalEntry } from '$lib/core/domain/types';
import {
	createEmptyJournalDraft,
	normalizeJournalDraft
} from './model';
import {
	deleteJournalEntry,
	listJournalEntriesForDay,
	saveJournalEntry,
	type JournalDraft
} from '$lib/features/journal/service';

export interface JournalPageState {
	loading: boolean;
	saving: boolean;
	localDay: string;
	saveNotice: string;
	entries: JournalEntry[];
	draft: JournalDraft;
}

export function createJournalPageState(): JournalPageState {
	return {
		loading: true,
		saving: false,
		localDay: '',
		saveNotice: '',
		entries: [],
		draft: createEmptyJournalDraft('')
	};
}

export async function loadJournalPage(
	db: HealthDatabase,
	localDay: string,
	state: JournalPageState
): Promise<JournalPageState> {
	const entries = await listJournalEntriesForDay(db, localDay);
	return {
		...state,
		loading: false,
		localDay,
		entries,
		draft: {
			...state.draft,
			localDay
		}
	};
}

export function beginJournalSave(state: JournalPageState): JournalPageState {
	return {
		...state,
		saving: true,
		saveNotice: ''
	};
}

async function refreshJournalEntries(
	db: HealthDatabase,
	state: JournalPageState,
	overrides: Partial<JournalPageState> = {}
): Promise<JournalPageState> {
	const entries = await listJournalEntriesForDay(db, state.localDay);
	return {
		...state,
		entries,
		...overrides
	};
}

export async function saveJournalPage(
	db: HealthDatabase,
	state: JournalPageState
): Promise<JournalPageState> {
	const saved = await saveJournalEntry(db, normalizeJournalDraft(state.draft, state.localDay));
	return await refreshJournalEntries(db, state, {
		saving: false,
		saveNotice: saved.title ? `${saved.title} saved.` : 'Entry saved.',
		draft: createEmptyJournalDraft(state.localDay)
	});
}

export async function deleteJournalPageEntry(
	db: HealthDatabase,
	state: JournalPageState,
	id: string
): Promise<JournalPageState> {
	await deleteJournalEntry(db, id);
	return await refreshJournalEntries(db, state);
}
