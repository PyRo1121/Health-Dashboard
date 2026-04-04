import { describe, expect, it } from 'vitest';
import {
	createHealthPageState,
	loadHealthPage,
	quickLogTemplatePage,
	saveAnxietyPage,
	saveSleepNotePage,
	saveSymptomPage,
	saveTemplatePage
} from '$lib/features/health/controller';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('health controller', () => {
	const getDb = useTestHealthDb('health-controller');

	it('loads state and runs the core health page actions', async () => {
		const db = getDb();
		let state = await loadHealthPage(db, '2026-04-02');
		expect(state.loading).toBe(false);
		expect(state.localDay).toBe('2026-04-02');

		state = await saveSymptomPage(db, {
			...state,
			symptomForm: {
				symptom: 'Nausea',
				severity: '2',
				note: 'Faded after breakfast'
			}
		});
		expect(state.saveNotice).toBe('Symptom logged.');
		expect(state.snapshot?.events.some((event) => event.eventType === 'symptom')).toBe(true);

		state = await saveAnxietyPage(db, {
			...state,
			anxietyForm: {
				intensity: '4',
				trigger: 'Busy inbox',
				durationMinutes: '15',
				note: 'Walked it off'
			}
		});
		expect(state.saveNotice).toBe('Anxiety episode logged.');

		state = await saveSleepNotePage(db, {
			...state,
			sleepNoteForm: {
				note: 'Fell asleep late',
				restfulness: '2',
				context: 'Screen time'
			}
		});
		expect(state.saveNotice).toBe('Sleep context logged.');

		state = await saveTemplatePage(db, {
			...state,
			templateForm: {
				label: 'Vitamin D3',
				templateType: 'supplement',
				defaultDose: '1',
				defaultUnit: 'softgel',
				note: 'Morning stack'
			}
		});
		expect(state.saveNotice).toBe('Template saved.');
		expect(state.snapshot?.templates).toHaveLength(1);

		state = await quickLogTemplatePage(db, state, state.snapshot?.templates[0]?.id ?? '');
		expect(state.saveNotice).toBe('Template logged.');
		expect(state.snapshot?.events.some((event) => event.eventType === 'supplement-dose')).toBe(true);
	});

	it('guards required symptom and sleep-note fields', async () => {
		const db = getDb();
		const state = await loadHealthPage(db, '2026-04-02');

		expect(await saveSymptomPage(db, createHealthPageState())).toMatchObject({
			saveNotice: 'Symptom name is required.'
		});
		expect(
			await saveSleepNotePage(db, {
				...state,
				sleepNoteForm: {
					note: '',
					restfulness: '',
					context: ''
				}
			})
		).toMatchObject({
			saveNotice: 'Sleep note is required.'
		});
	});
});
