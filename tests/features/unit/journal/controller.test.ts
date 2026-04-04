import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
	beginJournalSave,
	createJournalPageState,
	deleteJournalPageEntry,
	loadJournalPage,
	saveJournalPage
} from '$lib/features/journal/controller';

describe('journal controller', () => {
	const getDb = useTestHealthDb('journal-page-controller');

	it('loads, saves, and deletes journal state', async () => {
		const db = getDb();
		let state = await loadJournalPage(db, '2026-04-02', createJournalPageState());
		state = beginJournalSave({
			...state,
			draft: {
				...state.draft,
				localDay: '2026-04-02',
				title: 'Morning check-in',
				body: 'Woke up steady and ready to work.'
			}
		});
		state = await saveJournalPage(db, state);

		expect(state.saveNotice).toBe('Morning check-in saved.');
		expect(state.entries).toHaveLength(1);

		state = await deleteJournalPageEntry(db, state, state.entries[0]!.id);
		expect(state.entries).toEqual([]);
	});
});
