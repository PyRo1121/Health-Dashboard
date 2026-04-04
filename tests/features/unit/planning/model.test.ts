import { describe, expect, it } from 'vitest';
import type {
	ExerciseCatalogItem,
	FoodCatalogItem,
	GroceryItem,
	PlanSlot,
	RecipeCatalogItem,
	WorkoutTemplate
} from '$lib/core/domain/types';
import {
	addExerciseDraft,
	createExerciseSearchRows,
	createGroceryGroups,
	createGrocerySummary,
	createPlanningBoardDays,
	createPlanningSlotForm,
	createSlotSummary,
	createWorkoutTemplateForm,
	normalizeExerciseDrafts,
	removeExerciseDraft,
	updateExerciseDraftField
} from '$lib/features/planning/model';

describe('planning model', () => {
	it('creates default planner forms', () => {
		expect(createPlanningSlotForm('2026-04-02')).toEqual({
			localDay: '2026-04-02',
			slotType: 'meal',
			mealSource: 'recipe',
			recipeId: '',
			foodCatalogItemId: '',
			workoutTemplateId: '',
			title: '',
			notes: ''
		});

		expect(createWorkoutTemplateForm()).toEqual({
			title: '',
			goal: '',
			exercises: [{ name: '', reps: '' }]
		});
	});

	it('builds exercise draft rows, dedupes titles, and normalizes the final template payload', () => {
		const exercise: ExerciseCatalogItem = {
			id: 'wger:1',
			createdAt: '2026-04-03T00:00:00.000Z',
			updatedAt: '2026-04-03T00:00:00.000Z',
			sourceType: 'wger',
			externalId: '1',
			title: 'Goblet squat',
			muscleGroups: ['Quadriceps'],
			equipment: ['Dumbbell']
		};

		const withExercise = addExerciseDraft([{ name: '', reps: '' }], exercise);
		expect(withExercise).toEqual([
			{ name: 'Goblet squat', reps: '', exerciseCatalogId: 'wger:1' }
		]);
		expect(addExerciseDraft(withExercise, exercise)).toEqual(withExercise);

		const expanded = addExerciseDraft(withExercise);
		const updated = updateExerciseDraftField(expanded, 0, 'sets', '3');
		const updatedAgain = updateExerciseDraftField(updated, 0, 'restSeconds', '60');
		const updatedName = updateExerciseDraftField(updatedAgain, 1, 'name', ' Push-up ');

		expect(normalizeExerciseDrafts(updatedName)).toEqual([
			{ name: 'Goblet squat', exerciseCatalogId: 'wger:1', sets: 3, reps: undefined, restSeconds: 60 },
			{ name: 'Push-up', exerciseCatalogId: undefined, sets: undefined, reps: undefined, restSeconds: undefined }
		]);
		expect(removeExerciseDraft([{ name: 'Only row', reps: '8' }], 0)).toEqual([{ name: '', reps: '' }]);
	});

	it('builds planner board days, search rows, summaries, and grocery groups', () => {
		const slots: PlanSlot[] = [
			{
				id: 'slot-1',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				weeklyPlanId: 'weekly-plan-1',
				localDay: '2026-04-02',
				slotType: 'meal',
				itemType: 'food',
				itemId: 'food-1',
				title: 'Greek yogurt bowl',
				status: 'planned',
				order: 0
			},
			{
				id: 'slot-2',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				weeklyPlanId: 'weekly-plan-1',
				localDay: '2026-04-03',
				slotType: 'workout',
				itemType: 'workout-template',
				itemId: 'workout-1',
				title: 'Full body reset',
				status: 'planned',
				order: 0
			},
			{
				id: 'slot-3',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				weeklyPlanId: 'weekly-plan-1',
				localDay: '2026-04-04',
				slotType: 'note',
				itemType: 'freeform',
				title: 'Prep groceries',
				notes: 'Buy everything before dinner',
				status: 'planned',
				order: 0
			}
		];
		const foods: FoodCatalogItem[] = [
			{
				id: 'food-1',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				name: 'Greek yogurt bowl',
				sourceType: 'custom',
				sourceName: 'Local catalog',
				calories: 310,
				protein: 24,
				fiber: 6,
				carbs: 34,
				fat: 8
			}
		];
		const recipes: RecipeCatalogItem[] = [
			{
				id: 'themealdb:52772',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				title: 'Teriyaki Chicken Casserole',
				sourceType: 'themealdb',
				sourceName: 'TheMealDB',
				externalId: '52772',
				mealType: 'dinner',
				cuisine: 'Japanese',
				ingredients: ['3/4 cup soy sauce', '2 chicken breast']
			}
		];
		const workouts: WorkoutTemplate[] = [
			{
				id: 'workout-1',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				title: 'Full body reset',
				goal: 'Recovery',
				exerciseRefs: [{ name: 'Goblet squat', exerciseCatalogId: 'wger:1', reps: '8', sets: 3, restSeconds: 60 }]
			}
		];
		const exerciseCatalogItems: ExerciseCatalogItem[] = [
			{
				id: 'wger:1',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				sourceType: 'wger',
				externalId: '1',
				title: 'Goblet squat',
				muscleGroups: ['Quadriceps'],
				equipment: ['Dumbbell']
			}
		];
		const groceries: GroceryItem[] = [
			{
				id: 'grocery-2',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				weeklyPlanId: 'weekly-plan-1',
				ingredientKey: 'chicken breast',
				label: 'chicken breast',
				quantityText: '2',
				aisle: 'Protein & Dairy',
				checked: false,
				excluded: false,
				onHand: false,
				sourceRecipeIds: ['themealdb:52772']
			},
			{
				id: 'grocery-1',
				createdAt: '2026-04-02T08:00:00.000Z',
				updatedAt: '2026-04-02T08:00:00.000Z',
				weeklyPlanId: 'weekly-plan-1',
				ingredientKey: 'soy sauce',
				label: 'soy sauce',
				quantityText: '3/4 cup',
				aisle: 'Pantry',
				checked: true,
				excluded: false,
				onHand: true,
				sourceRecipeIds: ['themealdb:52772']
			}
		];

		expect(createExerciseSearchRows(exerciseCatalogItems)).toEqual([
			{ id: 'wger:1', title: 'Goblet squat', detail: 'Quadriceps · Dumbbell' }
		]);
		expect(createPlanningBoardDays(['2026-04-02', '2026-04-03'], slots)).toEqual([
			expect.objectContaining({ localDay: '2026-04-02', slots: [slots[0]] }),
			expect.objectContaining({ localDay: '2026-04-03', slots: [slots[1]] })
		]);
		expect(createSlotSummary(slots[0], foods, recipes, workouts, exerciseCatalogItems)).toBe(
			'Saved food · Local catalog · 24g protein'
		);
		expect(createSlotSummary(slots[1], foods, recipes, workouts, exerciseCatalogItems)).toBe(
			'Recovery · 1 exercise · Quadriceps · Dumbbell'
		);
		expect(createSlotSummary(slots[2], foods, recipes, workouts, exerciseCatalogItems)).toBe(
			'Buy everything before dinner'
		);
		expect(
			createSlotSummary(
				{ ...slots[0], itemId: 'missing-food' },
				foods,
				recipes,
				workouts,
				exerciseCatalogItems
			)
		).toBe('Saved food no longer available');
		expect(createGrocerySummary(groceries[1])).toBe('Pantry · 3/4 cup · On hand · Checked');
		expect(createGroceryGroups(groceries)).toEqual([
			{ aisle: 'Pantry', items: [groceries[1]] },
			{ aisle: 'Protein & Dairy', items: [groceries[0]] }
		]);
	});
});
