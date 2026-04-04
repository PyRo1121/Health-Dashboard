import { describe, expect, it } from 'vitest';
import {
	createNutritionDraftFromForm,
	createNutritionForm,
	createNutritionSummaryRows,
	mergeNutritionFormWithDraft
} from '$lib/features/nutrition/model';

describe('nutrition model', () => {
	it('derives nutrition drafts, form merges, and summary rows', () => {
		const form = mergeNutritionFormWithDraft(createNutritionForm(), {
			name: 'Oatmeal with berries',
			calories: 320,
			protein: 12,
			fiber: 8,
			carbs: 52,
			fat: 7
		});
		const draft = createNutritionDraftFromForm('2026-04-02', form, {
			id: 'fdc-oatmeal',
			name: 'Oatmeal with berries',
			calories: 320,
			protein: 12,
			fiber: 8,
			carbs: 52,
			fat: 7,
			sourceName: 'USDA fallback'
		});

		expect(draft).toMatchObject({
			localDay: '2026-04-02',
			calories: 320,
			carbs: 52,
			fat: 7,
			sourceName: 'USDA fallback'
		});
		expect(createNutritionSummaryRows({ calories: 320, protein: 12, fiber: 8, carbs: 52, fat: 7, entries: [] })).toEqual([
			'Calories: 320',
			'Protein: 12',
			'Fiber: 8',
			'Carbs: 52',
			'Fat: 7'
		]);
	});
});
