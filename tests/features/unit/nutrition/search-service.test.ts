import { afterEach, describe, expect, it, vi } from 'vitest';

describe('nutrition search service', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/nutrition/catalog-store');
    vi.doUnmock('$lib/server/nutrition/open-food-facts');
    vi.doUnmock('$lib/server/nutrition/themealdb');
    vi.doUnmock('$lib/server/nutrition/usda');
    vi.doUnmock('$lib/server/planning/store');
    vi.doUnmock('$lib/server/db/drizzle/client');
    vi.doUnmock('$lib/server/db/drizzle/schema');
    vi.doUnmock('$lib/server/db/drizzle/mirror');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('falls back to cached recipe matches when TheMealDB search fails', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(),
      normalizeOpenFoodFactsBarcode: vi.fn(),
      normalizeOpenFoodFactsProduct: vi.fn(),
      searchOpenFoodFactsProducts: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/themealdb', () => ({
      searchThemealdbRecipes: vi.fn(async () => {
        throw new Error('TheMealDB request failed with 500');
      }),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail: vi.fn(),
      normalizeUsdaFoodDetail: vi.fn(),
      searchUsdaFoods: vi.fn(),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listRecipeCatalogItemsServer: vi.fn(async () => [
        {
          id: 'recipe-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          title: 'Teriyaki Chicken Casserole',
          sourceType: 'themealdb',
          sourceName: 'TheMealDB',
          externalId: '52772',
          mealType: 'dinner',
          cuisine: 'Japanese',
          ingredients: ['Soy sauce', 'Chicken breast', 'Rice'],
        },
      ]),
      listWorkoutTemplatesServer: vi.fn(async () => []),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { foodCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));

    const { searchRecipesServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(searchRecipesServer('teriyaki')).resolves.toEqual([
      expect.objectContaining({
        id: 'recipe-1',
        title: 'Teriyaki Chicken Casserole',
        mealType: 'dinner',
      }),
    ]);
  });

  it('falls back to cached packaged-food matches when Open Food Facts search fails', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(async () => null),
      normalizeOpenFoodFactsBarcode: vi.fn((code: string) => code.replace(/\D+/g, '')),
      normalizeOpenFoodFactsProduct: vi.fn(),
      searchOpenFoodFactsProducts: vi.fn(async () => {
        throw new Error('Open Food Facts request failed with 500');
      }),
    }));
    vi.doMock('$lib/server/nutrition/themealdb', () => ({
      searchThemealdbRecipes: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail: vi.fn(),
      normalizeUsdaFoodDetail: vi.fn(),
      searchUsdaFoods: vi.fn(),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listFoodCatalogItemsServer: vi.fn(async () => [
        {
          id: 'off:049000028911',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          name: 'Diet Cola',
          sourceType: 'open-food-facts',
          sourceName: 'Open Food Facts',
          brandName: 'Acme Drinks',
          barcode: '049000028911',
          calories: 1,
          protein: 0,
          fiber: 0,
          carbs: 0,
          fat: 0,
        },
      ]),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      listWorkoutTemplatesServer: vi.fn(async () => []),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { foodCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));

    const { searchPackagedFoodsServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(searchPackagedFoodsServer('cola')).resolves.toEqual({
      matches: [
        expect.objectContaining({
          id: 'off:049000028911',
          name: 'Diet Cola',
          brandName: 'Acme Drinks',
        }),
      ],
      notice: 'Open Food Facts search unavailable, using local packaged foods.',
      metadata: expect.objectContaining({
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
      }),
    });
  });

  it('returns structured null barcode metadata when Open Food Facts lookup fails and no local item exists', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(async () => {
        throw new Error('Open Food Facts request failed with 500');
      }),
      normalizeOpenFoodFactsBarcode: vi.fn((code: string) => code.replace(/\D+/g, '')),
      normalizeOpenFoodFactsProduct: vi.fn(),
      searchOpenFoodFactsProducts: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/themealdb', () => ({
      searchThemealdbRecipes: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail: vi.fn(),
      normalizeUsdaFoodDetail: vi.fn(),
      searchUsdaFoods: vi.fn(),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      listWorkoutTemplatesServer: vi.fn(async () => []),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { foodCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));

    const { lookupNutritionBarcodeServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(lookupNutritionBarcodeServer('049000028911')).resolves.toEqual({
      match: null,
      metadata: expect.objectContaining({
        cacheStatus: 'none',
        degradationStatus: 'degraded',
      }),
    });
  });

  it('marks packaged searches as remote-live when a normalized remote product is cached', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => ({
        ...item,
        id: 'off:049000028911',
      })),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(async () => null),
      normalizeOpenFoodFactsBarcode: vi.fn((code: string) => code.replace(/\D+/g, '')),
      normalizeOpenFoodFactsProduct: vi.fn(() => ({
        id: 'off:049000028911',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        name: 'Diet Cola',
        sourceType: 'open-food-facts',
        sourceName: 'Open Food Facts',
        brandName: 'Acme Drinks',
        barcode: '049000028911',
        calories: 1,
        protein: 0,
        fiber: 0,
        carbs: 0,
        fat: 0,
      })),
      searchOpenFoodFactsProducts: vi.fn(async () => [{ code: '049000028911' }]),
    }));
    vi.doMock('$lib/server/nutrition/themealdb', () => ({
      searchThemealdbRecipes: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail: vi.fn(),
      normalizeUsdaFoodDetail: vi.fn(),
      searchUsdaFoods: vi.fn(),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      listWorkoutTemplatesServer: vi.fn(async () => []),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { foodCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));

    const { searchPackagedFoodsServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(searchPackagedFoodsServer('cola')).resolves.toEqual({
      matches: [
        expect.objectContaining({
          id: 'off:049000028911',
          name: 'Diet Cola',
          brandName: 'Acme Drinks',
        }),
      ],
      metadata: expect.objectContaining({
        cacheStatus: 'remote-live',
        degradationStatus: 'none',
      }),
    });
  });

  it('returns a degraded null barcode envelope when the remote product cannot be normalized', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(async () => ({ code: '049000028911' })),
      normalizeOpenFoodFactsBarcode: vi.fn((code: string) => code.replace(/\D+/g, '')),
      normalizeOpenFoodFactsProduct: vi.fn(() => null),
      searchOpenFoodFactsProducts: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/themealdb', () => ({
      searchThemealdbRecipes: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail: vi.fn(),
      normalizeUsdaFoodDetail: vi.fn(),
      searchUsdaFoods: vi.fn(),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listFoodCatalogItemsServer: vi.fn(async () => []),
      listRecipeCatalogItemsServer: vi.fn(async () => []),
      listWorkoutTemplatesServer: vi.fn(async () => []),
      listExerciseCatalogItemsServer: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/db/drizzle/client', () => ({
      getServerDrizzleClient: () => ({ db: { mocked: true } }),
    }));
    vi.doMock('$lib/server/db/drizzle/schema', () => ({
      drizzleSchema: { foodCatalogItems: {} },
    }));
    vi.doMock('$lib/server/db/drizzle/mirror', () => ({
      selectMirrorRecordById: vi.fn(async () => null),
    }));

    const { lookupNutritionBarcodeServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(lookupNutritionBarcodeServer('049000028911')).resolves.toEqual({
      match: null,
      metadata: expect.objectContaining({
        cacheStatus: 'none',
        degradationStatus: 'degraded',
      }),
    });
  });
});
