import { describe, expect, it } from 'vitest';
import { planningRequestSchema } from '$lib/features/planning/contracts';

describe('planning contracts', () => {
	it('accepts a valid planning slot save request', () => {
		const parsed = planningRequestSchema.parse({
			action: 'saveSlot',
			state: {
				loading: false,
				localDay: '2026-04-07',
				saveNotice: '',
				weeklyPlan: {
					id: 'weekly-plan-1',
					weekStart: '2026-04-06'
				},
				weekDays: [],
				slots: [],
				groceryItems: [],
				exerciseCatalogItems: [],
				foodCatalogItems: [],
				recipeCatalogItems: [],
				workoutTemplates: [],
				exerciseSearchQuery: '',
				exerciseSearchResults: [],
				slotForm: {
					localDay: '2026-04-07',
					slotType: 'meal',
					mealSource: 'recipe',
					recipeId: 'themealdb:52772',
					foodCatalogItemId: '',
					workoutTemplateId: '',
					title: '',
					notes: ''
				},
				workoutTemplateForm: {
					title: '',
					goal: '',
					exercises: [{ name: '', reps: '' }]
				}
			}
		});

		if (parsed.action !== 'saveSlot') {
			throw new Error('Expected saveSlot action');
		}

		expect(parsed.action).toBe('saveSlot');
		expect(parsed.state.slotForm.slotType).toBe('meal');
	});

	it('rejects invalid planner enums and malformed grocery patches', () => {
		const invalidStatus = planningRequestSchema.safeParse({
			action: 'markSlotStatus',
			state: {
				localDay: '2026-04-07'
			},
			slotId: 'slot-1',
			status: 'archived'
		});
		expect(invalidStatus.success).toBe(false);

		const invalidPatch = planningRequestSchema.safeParse({
			action: 'toggleGrocery',
			state: {
				localDay: '2026-04-07'
			},
			itemId: 'grocery-1',
			patch: {
				checked: 'yes',
				excluded: false,
				onHand: false
			}
		});
		expect(invalidPatch.success).toBe(false);
	});
});
