import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	beginJournalSave,
	createJournalPageState,
	deleteJournalPageEntry as deleteJournalPageEntryController,
	loadJournalPage as loadJournalPageController,
	saveJournalPage as saveJournalPageController,
	type JournalPageState
} from './controller';

export { beginJournalSave, createJournalPageState };

export async function loadJournalPage(
	state: JournalPageState,
	localDay = currentLocalDay()
): Promise<JournalPageState> {
	return await postFeatureRequest(
		'/api/journal',
		{
			action: 'load',
			localDay,
			state
		},
		(db) => loadJournalPageController(db, localDay, state)
	);
}

export async function saveJournalPage(state: JournalPageState): Promise<JournalPageState> {
	return await postFeatureRequest(
		'/api/journal',
		{
			action: 'save',
			state
		},
		(db) => saveJournalPageController(db, state)
	);
}

export async function deleteJournalPageEntry(
	state: JournalPageState,
	id: string
): Promise<JournalPageState> {
	return await postFeatureRequest(
		'/api/journal',
		{
			action: 'delete',
			state,
			id
		},
		(db) => deleteJournalPageEntryController(db, state, id)
	);
}
