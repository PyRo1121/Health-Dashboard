import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
	createAssessmentsPageState,
	loadAssessmentsPage,
	saveAssessmentsProgressPage,
	setAssessmentsInstrument,
	submitAssessmentsPage
} from '$lib/features/assessments/controller';

describe('assessments controller', () => {
	const getDb = useTestHealthDb('assessments-page-controller');

	it('loads and submits assessment controller state', async () => {
		const db = getDb();
		let state = createAssessmentsPageState();
		state = await loadAssessmentsPage(db, '2026-04-02', state);
		expect(state.loading).toBe(false);
		expect(state.instrument).toBe('PHQ-9');
		state = setAssessmentsInstrument(state, 'GAD-7');
		state = await loadAssessmentsPage(db, '2026-04-02', state);
		expect(state.draftResponses).toHaveLength(7);

		state = {
			...state,
			draftResponses: [1, 2, 1]
		};
		state = await saveAssessmentsProgressPage(db, state);
		expect(state.saveNotice).toBe('Progress saved.');

		state = setAssessmentsInstrument(state, 'PHQ-9');
		state = await loadAssessmentsPage(db, '2026-04-02', state);
		state = {
			...state,
			draftResponses: [1, 1, 1, 1, 1, 1, 1, 1, 1]
		};
		state = await submitAssessmentsPage(db, state);
		expect(state.latest?.totalScore).toBe(9);
		expect(state.safetyMessage).toMatch(/need more support/i);
	});

	it('surfaces validation errors for incomplete submissions', async () => {
		const db = getDb();
		let state = await loadAssessmentsPage(db, '2026-04-02', createAssessmentsPageState());
		state = {
			...state,
			draftResponses: [0, 1, 0]
		};

		state = await submitAssessmentsPage(db, state);

		expect(state.validationError).toMatch(/incomplete assessment/i);
	});
});
