import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNutritionPageState } from '$lib/features/nutrition/state';

function createState() {
  return {
    ...createNutritionPageState(),
    loading: false,
    localDay: '2026-04-14',
  };
}

describe('nutrition server meal mutations', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/nutrition/catalog-store');
    vi.doUnmock('$lib/server/nutrition/page-loader');
    vi.doUnmock('$lib/server/planning/store');
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/schema');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('cleans up stale planned food slots before saving a new planned meal on the server path', async () => {
    const deletePlanSlotServer = vi.fn(async () => undefined);
    const savePlanSlotServer = vi.fn(async () => undefined);
    const ensureWeeklyPlanServer = vi.fn(async () => ({ id: 'weekly-plan-1' }));
    const resolveNutritionPlannedFoodIdServer = vi.fn(async () => 'food-catalog-1');
    const refreshNutritionPageAfterMutationServer = vi.fn(async (state, overrides) => ({
      ...state,
      ...overrides,
    }));

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      createFoodEntryServer: vi.fn(),
      resolveNutritionPlannedFoodIdServer,
      saveFavoriteMealServer: vi.fn(),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { favoriteMeals: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));
    vi.doMock('$lib/server/nutrition/page-loader', () => ({
      refreshNutritionPageAfterMutationServer,
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      deletePlanSlotServer,
      ensureWeeklyPlanServer,
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listPlanSlotsForDayServer: vi.fn(async () => [
        {
          id: 'stale-slot',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          weeklyPlanId: 'weekly-plan-1',
          localDay: '2026-04-14',
          slotType: 'meal',
          itemType: 'food',
          itemId: 'missing-food',
          mealType: 'breakfast',
          title: 'Missing breakfast',
          status: 'planned',
          order: 0,
        },
      ]),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      savePlanSlotServer,
    }));

    const { planNutritionMealServer } =
      await import('../../../../src/lib/server/nutrition/meal-mutations.ts');

    const result = await planNutritionMealServer(createState(), {
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
      notes: '',
      foodCatalogItemId: 'food-catalog-1',
    });

    expect(deletePlanSlotServer).toHaveBeenCalledWith('stale-slot');
    expect(resolveNutritionPlannedFoodIdServer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Greek yogurt bowl',
        foodCatalogItemId: 'food-catalog-1',
      })
    );
    expect(savePlanSlotServer).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyPlanId: 'weekly-plan-1',
        localDay: '2026-04-14',
        slotType: 'meal',
        itemType: 'food',
        itemId: 'food-catalog-1',
        mealType: 'breakfast',
        title: 'Greek yogurt bowl',
      })
    );
    expect(result.saveNotice).toBe('Planned next meal saved.');
  });

  it('plans recipe drafts as recipe slots on the server path without cloning them into the food catalog', async () => {
    const deletePlanSlotServer = vi.fn(async () => undefined);
    const savePlanSlotServer = vi.fn(async () => undefined);
    const ensureWeeklyPlanServer = vi.fn(async () => ({ id: 'weekly-plan-1' }));
    const resolveNutritionPlannedFoodIdServer = vi.fn(async () => 'food-catalog-1');
    const refreshNutritionPageAfterMutationServer = vi.fn(async (state, overrides) => ({
      ...state,
      ...overrides,
    }));

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      createFoodEntryServer: vi.fn(),
      resolveNutritionPlannedFoodIdServer,
      saveFavoriteMealServer: vi.fn(),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { favoriteMeals: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));
    vi.doMock('$lib/server/nutrition/page-loader', () => ({
      refreshNutritionPageAfterMutationServer,
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      deletePlanSlotServer,
      ensureWeeklyPlanServer,
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listPlanSlotsForDayServer: vi.fn(async () => []),
      listRecipeCatalogItemsServer: vi.fn(async () => [
        {
          id: 'recipe-1',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          title: 'Teriyaki Chicken Casserole',
          sourceType: 'themealdb',
          sourceName: 'TheMealDB',
          externalId: '52772',
          mealType: 'dinner',
          cuisine: 'Japanese',
          ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
        },
      ]),
      savePlanSlotServer,
    }));

    const { planNutritionMealServer } =
      await import('../../../../src/lib/server/nutrition/meal-mutations.ts');

    const result = await planNutritionMealServer(createState(), {
      name: 'Teriyaki Chicken Casserole',
      mealType: 'dinner',
      calories: 0,
      protein: 0,
      fiber: 0,
      carbs: 0,
      fat: 0,
      notes: '3/4 cup soy sauce, 2 chicken breast',
      recipeCatalogItemId: 'recipe-1',
      sourceName: 'TheMealDB',
    });

    expect(resolveNutritionPlannedFoodIdServer).not.toHaveBeenCalled();
    expect(savePlanSlotServer).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklyPlanId: 'weekly-plan-1',
        localDay: '2026-04-14',
        slotType: 'meal',
        itemType: 'recipe',
        itemId: 'recipe-1',
        mealType: 'dinner',
        title: 'Teriyaki Chicken Casserole',
      })
    );
    expect(result.saveNotice).toBe('Planned next meal saved.');
  });

  it('blocks a new nutrition-planned meal when a canonical planned food slot already exists', async () => {
    const deletePlanSlotServer = vi.fn(async () => undefined);
    const savePlanSlotServer = vi.fn(async () => undefined);

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      createFoodEntryServer: vi.fn(),
      resolveNutritionPlannedFoodIdServer: vi.fn(async () => 'food-catalog-1'),
      saveFavoriteMealServer: vi.fn(),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { favoriteMeals: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));
    vi.doMock('$lib/server/nutrition/page-loader', () => ({
      refreshNutritionPageAfterMutationServer: vi.fn(async (state, overrides) => ({
        ...state,
        ...overrides,
      })),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      deletePlanSlotServer,
      ensureWeeklyPlanServer: vi.fn(async () => ({ id: 'weekly-plan-1' })),
      listFoodCatalogItemsServer: vi.fn(async () => [
        {
          id: 'food-catalog-1',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          name: 'Greek yogurt bowl',
          sourceType: 'custom',
          sourceName: 'Local catalog',
          calories: 310,
          protein: 24,
          fiber: 6,
          carbs: 34,
          fat: 8,
        },
      ]),
      listPlanSlotsForDayServer: vi.fn(async () => [
        {
          id: 'existing-slot',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          weeklyPlanId: 'weekly-plan-1',
          localDay: '2026-04-14',
          slotType: 'meal',
          itemType: 'food',
          itemId: 'food-catalog-1',
          mealType: 'breakfast',
          title: 'Greek yogurt bowl',
          status: 'planned',
          order: 0,
        },
      ]),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      savePlanSlotServer,
    }));

    const { planNutritionMealServer } =
      await import('../../../../src/lib/server/nutrition/meal-mutations.ts');

    const result = await planNutritionMealServer(createState(), {
      name: 'Another breakfast',
      mealType: 'breakfast',
      calories: 400,
      protein: 20,
      fiber: 5,
      carbs: 40,
      fat: 12,
      notes: '',
    });

    expect(result.saveNotice).toBe(
      'Today already has a planned meal from Plan. Update it there instead.'
    );
    expect(deletePlanSlotServer).not.toHaveBeenCalled();
    expect(savePlanSlotServer).not.toHaveBeenCalled();
  });

  it('blocks a new nutrition-planned meal when a canonical planned recipe slot already exists', async () => {
    const deletePlanSlotServer = vi.fn(async () => undefined);
    const savePlanSlotServer = vi.fn(async () => undefined);

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      createFoodEntryServer: vi.fn(),
      resolveNutritionPlannedFoodIdServer: vi.fn(async () => 'food-catalog-1'),
      saveFavoriteMealServer: vi.fn(),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { favoriteMeals: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));
    vi.doMock('$lib/server/nutrition/page-loader', () => ({
      refreshNutritionPageAfterMutationServer: vi.fn(async (state, overrides) => ({
        ...state,
        ...overrides,
      })),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      deletePlanSlotServer,
      ensureWeeklyPlanServer: vi.fn(async () => ({ id: 'weekly-plan-1' })),
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listRecipeCatalogItemsServer: vi.fn(async () => [
        {
          id: 'recipe-1',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          title: 'Teriyaki Chicken Casserole',
          sourceType: 'themealdb',
          sourceName: 'TheMealDB',
          externalId: '52772',
          mealType: 'dinner',
          cuisine: 'Japanese',
          ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
        },
      ]),
      listPlanSlotsForDayServer: vi.fn(async () => [
        {
          id: 'existing-slot',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          weeklyPlanId: 'weekly-plan-1',
          localDay: '2026-04-14',
          slotType: 'meal',
          itemType: 'recipe',
          itemId: 'recipe-1',
          title: 'Teriyaki Chicken Casserole',
          status: 'planned',
          order: 0,
        },
      ]),
      savePlanSlotServer,
    }));

    const { planNutritionMealServer } =
      await import('../../../../src/lib/server/nutrition/meal-mutations.ts');

    const result = await planNutritionMealServer(createState(), {
      name: 'Another dinner',
      mealType: 'dinner',
      calories: 400,
      protein: 20,
      fiber: 5,
      carbs: 40,
      fat: 12,
      notes: '',
    });

    expect(result.saveNotice).toBe(
      'Today already has a planned meal from Plan. Update it there instead.'
    );
    expect(deletePlanSlotServer).not.toHaveBeenCalled();
    expect(savePlanSlotServer).not.toHaveBeenCalled();
  });

  it('clears stale sibling planned-food slots when the visible planned meal is cleared on the server path', async () => {
    const deletePlanSlotServer = vi.fn(async () => undefined);
    const refreshNutritionPageAfterMutationServer = vi.fn(async (state, overrides) => ({
      ...state,
      ...overrides,
    }));

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      createFoodEntryServer: vi.fn(),
      resolveNutritionPlannedFoodIdServer: vi.fn(async () => 'food-catalog-1'),
      saveFavoriteMealServer: vi.fn(),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { favoriteMeals: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));
    vi.doMock('$lib/server/nutrition/page-loader', () => ({
      refreshNutritionPageAfterMutationServer,
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      deletePlanSlotServer,
      ensureWeeklyPlanServer: vi.fn(async () => ({ id: 'weekly-plan-1' })),
      listFoodCatalogItemsServer: vi.fn(async () => [
        {
          id: 'food-catalog-1',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          name: 'Greek yogurt bowl',
          sourceType: 'custom',
          sourceName: 'Local catalog',
          calories: 310,
          protein: 24,
          fiber: 6,
          carbs: 34,
          fat: 8,
        },
      ]),
      listPlanSlotsForDayServer: vi.fn(async () => [
        {
          id: 'stale-slot',
          createdAt: '2026-04-14T08:00:00.000Z',
          updatedAt: '2026-04-14T08:00:00.000Z',
          weeklyPlanId: 'weekly-plan-1',
          localDay: '2026-04-14',
          slotType: 'meal',
          itemType: 'food',
          itemId: 'missing-food',
          mealType: 'breakfast',
          title: 'Missing breakfast',
          status: 'planned',
          order: 0,
        },
        {
          id: 'valid-slot',
          createdAt: '2026-04-14T08:10:00.000Z',
          updatedAt: '2026-04-14T08:10:00.000Z',
          weeklyPlanId: 'weekly-plan-1',
          localDay: '2026-04-14',
          slotType: 'meal',
          itemType: 'food',
          itemId: 'food-catalog-1',
          mealType: 'lunch',
          title: 'Greek yogurt bowl',
          status: 'planned',
          order: 1,
        },
      ]),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      savePlanSlotServer: vi.fn(async () => undefined),
    }));

    const { clearNutritionPlannedMealServer } =
      await import('../../../../src/lib/server/nutrition/meal-mutations.ts');

    const result = await clearNutritionPlannedMealServer({
      ...createState(),
      plannedMealSlotId: 'valid-slot',
    });

    expect(deletePlanSlotServer).toHaveBeenNthCalledWith(1, 'valid-slot');
    expect(deletePlanSlotServer).toHaveBeenNthCalledWith(2, 'stale-slot');
    expect(result.saveNotice).toBe('Planned meal cleared.');
  });
});
