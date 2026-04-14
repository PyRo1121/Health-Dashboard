import { describe, expect, it } from 'vitest';
import {
  listStalePlannedMealSlotIdsFromData,
  listStalePlannedFoodSlotIdsFromData,
  resolveNutritionPlannedMeal,
} from '$lib/features/nutrition/planned-meal-resolution';
import type { FoodCatalogItem, PlanSlot, RecipeCatalogItem } from '$lib/core/domain/types';

function createFood(id: string, overrides: Partial<FoodCatalogItem> = {}): FoodCatalogItem {
  return {
    id,
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    name: 'Greek yogurt bowl',
    sourceType: 'custom',
    sourceName: 'Local catalog',
    calories: 310,
    protein: 24,
    fiber: 6,
    carbs: 34,
    fat: 8,
    ...overrides,
  };
}

function createSlot(id: string, overrides: Partial<PlanSlot> = {}): PlanSlot {
  return {
    id,
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    weeklyPlanId: 'weekly-plan-1',
    localDay: '2026-04-14',
    slotType: 'meal',
    itemType: 'food',
    itemId: 'food-1',
    mealType: 'breakfast',
    title: 'Greek yogurt bowl',
    notes: 'Planned from Nutrition',
    status: 'planned',
    order: 0,
    ...overrides,
  };
}

function createRecipe(id: string, overrides: Partial<RecipeCatalogItem> = {}): RecipeCatalogItem {
  return {
    id,
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    title: 'Teriyaki Chicken Casserole',
    sourceType: 'themealdb',
    sourceName: 'TheMealDB',
    externalId: '52772',
    mealType: 'dinner',
    cuisine: 'Japanese',
    ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
    ...overrides,
  };
}

describe('nutrition planned meal resolution', () => {
  it('resolves a planned saved-food slot into the today/nutrition meal shape', () => {
    const resolution = resolveNutritionPlannedMeal([createSlot('slot-1')], [createFood('food-1')]);

    expect(resolution.issue).toBeNull();
    expect(resolution.candidate).toEqual({
      kind: 'plan-slot-food',
      slotId: 'slot-1',
      source: {
        kind: 'food',
        id: 'food-1',
        sourceName: 'Local catalog',
      },
      meal: expect.objectContaining({
        id: 'planned-slot:slot-1',
        name: 'Greek yogurt bowl',
        mealType: 'breakfast',
        calories: 310,
        protein: 24,
        sourceName: 'Local catalog',
        notes: 'Planned from Nutrition',
      }),
    });
  });

  it('surfaces a stable repair issue when the planned saved-food slot points at a missing item', () => {
    const resolution = resolveNutritionPlannedMeal([createSlot('stale-slot')], []);

    expect(resolution.candidate).toBeNull();
    expect(resolution.issue).toBe(
      'That planned meal no longer exists. Replace it in Plan before using it.'
    );
  });

  it('prefers a later valid planned saved-food slot over an earlier stale one', () => {
    const resolution = resolveNutritionPlannedMeal(
      [
        createSlot('stale-slot', { itemId: 'missing-food', title: 'Missing breakfast' }),
        createSlot('valid-slot', {
          itemId: 'food-1',
          title: 'Greek yogurt bowl',
          mealType: 'lunch',
          order: 1,
        }),
      ],
      [createFood('food-1')]
    );

    expect(resolution.issue).toBeNull();
    expect(resolution.candidate).toEqual({
      kind: 'plan-slot-food',
      slotId: 'valid-slot',
      source: {
        kind: 'food',
        id: 'food-1',
        sourceName: 'Local catalog',
      },
      meal: expect.objectContaining({
        name: 'Greek yogurt bowl',
        mealType: 'lunch',
      }),
    });
  });

  it('resolves a planned recipe slot into the today/nutrition meal shape', () => {
    const resolution = resolveNutritionPlannedMeal(
      [
        createSlot('recipe-slot', {
          itemType: 'recipe',
          itemId: 'recipe-1',
          title: 'Teriyaki Chicken Casserole',
          mealType: undefined,
          notes: undefined,
        }),
      ],
      [],
      [createRecipe('recipe-1')]
    );

    expect(resolution.issue).toBeNull();
    expect(resolution.candidate).toEqual({
      kind: 'plan-slot-recipe',
      slotId: 'recipe-slot',
      source: {
        kind: 'recipe',
        id: 'recipe-1',
        sourceName: 'TheMealDB',
      },
      meal: expect.objectContaining({
        name: 'Teriyaki Chicken Casserole',
        mealType: 'dinner',
        sourceName: 'TheMealDB',
        notes: '3/4 cup soy sauce, 2 chicken breast',
      }),
    });
  });

  it('lists only stale planned saved-food slot ids for cleanup', () => {
    const staleIds = listStalePlannedFoodSlotIdsFromData(
      [
        createSlot('stale-slot', { itemId: 'missing-food', title: 'Missing breakfast' }),
        createSlot('valid-slot', { itemId: 'food-1', title: 'Greek yogurt bowl', order: 1 }),
        createSlot('done-slot', { itemId: 'missing-food', status: 'done', order: 2 }),
        createSlot('recipe-slot', {
          itemType: 'recipe',
          itemId: 'recipe-1',
          title: 'Teriyaki casserole',
          order: 3,
        }),
      ],
      [createFood('food-1')]
    );

    expect(staleIds).toEqual(['stale-slot']);
  });

  it('lists stale planned meal slot ids for both food and recipe entries', () => {
    const staleIds = listStalePlannedMealSlotIdsFromData(
      [
        createSlot('stale-food-slot', { itemId: 'missing-food', title: 'Missing breakfast' }),
        createSlot('stale-recipe-slot', {
          itemType: 'recipe',
          itemId: 'missing-recipe',
          title: 'Missing dinner',
          order: 1,
        }),
        createSlot('valid-food-slot', { itemId: 'food-1', title: 'Greek yogurt bowl', order: 2 }),
        createSlot('valid-recipe-slot', {
          itemType: 'recipe',
          itemId: 'recipe-1',
          title: 'Teriyaki Chicken Casserole',
          order: 3,
        }),
      ],
      [createFood('food-1')],
      [createRecipe('recipe-1')]
    );

    expect(staleIds).toEqual(['stale-food-slot', 'stale-recipe-slot']);
  });
});
