import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { savePlannedMeal } from '$lib/features/nutrition/service';
import {
	beginTodaySave,
	clearTodayPlannedMealPage,
	loadTodayPage,
	logTodayPlannedMealPage,
	saveTodayPage
} from '$lib/features/today/controller';

describe('today controller', () => {
	const getDb = useTestHealthDb('today-page-controller');

	it('loads and saves the today page state', async () => {
		const db = getDb();
		let state = await loadTodayPage(db, '2026-04-02');
		expect(state.loading).toBe(false);
		expect(state.todayDate).toBe('2026-04-02');

		state = beginTodaySave({
			...state,
			form: {
				...state.form,
				mood: '4',
				energy: '3',
				stress: '2',
				focus: '5',
				sleepHours: '7.5',
				sleepQuality: '4',
				freeformNote: 'Steady start.'
			}
		});
		state = await saveTodayPage(db, state);

		expect(state.saving).toBe(false);
		expect(state.saveNotice).toBe('Saved for today.');
		expect(state.snapshot?.dailyRecord?.mood).toBe(4);
		expect(state.snapshot?.events).toHaveLength(6);
	});

	it('logs and clears a planned meal from the today page state', async () => {
		const db = getDb();
		await savePlannedMeal(db, {
			name: 'Greek yogurt bowl',
			mealType: 'breakfast',
			calories: 310,
			protein: 24,
			fiber: 6,
			carbs: 34,
			fat: 8,
			sourceName: 'Local catalog'
		});

		let state = await loadTodayPage(db, '2026-04-02');
		expect(state.snapshot?.plannedMeal?.name).toBe('Greek yogurt bowl');

		state = await logTodayPlannedMealPage(db, state);
		expect(state.saveNotice).toBe('Planned meal logged.');
		expect(state.snapshot?.plannedMeal).toBeNull();
		expect(state.snapshot?.foodEntries).toHaveLength(1);

		await savePlannedMeal(db, {
			name: 'Lentil soup',
			mealType: 'lunch',
			calories: 280,
			protein: 16,
			fiber: 11,
			carbs: 39,
			fat: 6
		});

		state = await loadTodayPage(db, '2026-04-02');
		state = await clearTodayPlannedMealPage(db, state);
		expect(state.saveNotice).toBe('Planned meal cleared.');
		expect(state.snapshot?.plannedMeal).toBeNull();
	});
});
