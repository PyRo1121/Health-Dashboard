import { describe, expect, it } from 'vitest';
import type {
  ExerciseCatalogItem,
  FoodCatalogItem,
  GroceryItem,
  PlanSlot,
  RecipeCatalogItem,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import {
  createPlanningBoardDays,
  createPlanningSlotForm,
  createSlotSummary,
} from '$lib/features/planning/model';
import { createGroceryGroups, createGrocerySummary } from '$lib/features/groceries/model';

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
      notes: '',
    });
  });

  it('builds planner board days, summaries, and grocery groups', () => {
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
        order: 0,
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
        order: 0,
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
        order: 0,
      },
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
        fat: 8,
      },
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
        ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
      },
    ];
    const workouts: WorkoutTemplate[] = [
      {
        id: 'workout-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        title: 'Full body reset',
        goal: 'Recovery',
        exerciseRefs: [
          {
            name: 'Goblet squat',
            exerciseCatalogId: 'wger:1',
            reps: '8',
            sets: 3,
            restSeconds: 60,
          },
        ],
      },
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
        equipment: ['Dumbbell'],
      },
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
        sourceRecipeIds: ['themealdb:52772'],
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
        sourceRecipeIds: ['themealdb:52772'],
      },
    ];

    expect(createPlanningBoardDays(['2026-04-02', '2026-04-03'], slots)).toEqual([
      expect.objectContaining({ localDay: '2026-04-02', slots: [slots[0]] }),
      expect.objectContaining({ localDay: '2026-04-03', slots: [slots[1]] }),
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
      { aisle: 'Protein & Dairy', items: [groceries[0]] },
    ]);
  });
});
