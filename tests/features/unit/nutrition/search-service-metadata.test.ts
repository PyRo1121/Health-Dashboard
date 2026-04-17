import { afterEach, describe, expect, it, vi } from 'vitest';

describe('nutrition search service metadata', () => {
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
    delete process.env.USDA_FDC_API_KEY;
    delete process.env.FDC_API_KEY;
  });

  it('returns degraded packaged-search metadata when Open Food Facts fails and local cache serves the result', async () => {
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

    await expect(searchPackagedFoodsServer('cola')).resolves.toMatchObject({
      matches: [
        expect.objectContaining({
          id: 'off:049000028911',
          name: 'Diet Cola',
        }),
      ],
      notice: 'Open Food Facts search unavailable, using local packaged foods.',
      metadata: {
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
        provenance: [
          expect.objectContaining({
            sourceId: 'open-food-facts',
            sourceName: 'Open Food Facts',
          }),
        ],
      },
    });
  });

  it('returns local-cache barcode metadata and skips remote lookup when a local packaged food exists', async () => {
    const fetchOpenFoodFactsProductByBarcode = vi.fn(async () => null);

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode,
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

    const { lookupNutritionBarcodeServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(lookupNutritionBarcodeServer('049000028911')).resolves.toMatchObject({
      match: expect.objectContaining({
        id: 'off:049000028911',
        name: 'Diet Cola',
      }),
      notice: 'Packaged food loaded from local cache.',
      metadata: {
        cacheStatus: 'local-cache',
        degradationStatus: 'none',
        provenance: [
          expect.objectContaining({
            sourceId: 'open-food-facts',
          }),
        ],
      },
    });
    expect(fetchOpenFoodFactsProductByBarcode).not.toHaveBeenCalled();
  });

  it('returns USDA fallback metadata when no USDA key is configured', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(async () => null),
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

    const { searchUsdaFoodsServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(searchUsdaFoodsServer('oatmeal')).resolves.toMatchObject({
      matches: expect.any(Array),
      notice: 'USDA live search unavailable, using local fallback foods.',
      metadata: {
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
        provenance: [
          expect.objectContaining({
            sourceId: 'usda-fooddata-central',
            sourceName: 'USDA FoodData Central',
          }),
        ],
      },
    });
  });

  it('does not surface custom local foods as USDA-backed local cache matches', async () => {
    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode: vi.fn(async () => null),
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
      searchUsdaFoods: vi.fn(async () => []),
    }));
    vi.doMock('$lib/server/planning/store', () => ({
      listFoodCatalogItemsServer: vi.fn(async () => [
        {
          id: 'food-catalog-1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          name: 'Custom oatmeal bowl',
          sourceType: 'custom',
          sourceName: 'Local catalog',
          calories: 320,
          protein: 12,
          fiber: 8,
          carbs: 52,
          fat: 7,
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

    const { searchUsdaFoodsServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(searchUsdaFoodsServer('oatmeal')).resolves.toMatchObject({
      matches: [
        expect.objectContaining({
          id: 'fdc-oatmeal',
          name: 'Oatmeal with berries',
          sourceName: 'USDA fallback',
        }),
      ],
      notice: 'USDA live search unavailable, using local fallback foods.',
      metadata: {
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
        provenance: [
          expect.objectContaining({
            sourceId: 'usda-fooddata-central',
          }),
        ],
      },
    });
  });

  it('does not treat a custom local barcode hit as an Open Food Facts cached match', async () => {
    const fetchOpenFoodFactsProductByBarcode = vi.fn(async () => null);

    vi.doMock('$lib/server/nutrition/catalog-store', () => ({
      upsertFoodCatalogItemServer: vi.fn(async (item) => item),
      upsertRecipeCatalogItemServer: vi.fn(async (recipe) => recipe),
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode,
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
      listFoodCatalogItemsServer: vi.fn(async () => [
        {
          id: 'food-catalog-1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          name: 'Custom granola bar',
          sourceType: 'custom',
          sourceName: 'Local catalog',
          barcode: '049000028911',
          calories: 220,
          protein: 4,
          fiber: 3,
          carbs: 28,
          fat: 9,
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

    const { lookupNutritionBarcodeServer } =
      await import('../../../../src/lib/server/nutrition/search-service.ts');

    await expect(lookupNutritionBarcodeServer('049000028911')).resolves.toMatchObject({
      match: null,
      metadata: {
        cacheStatus: 'none',
        degradationStatus: 'none',
        provenance: [
          expect.objectContaining({
            sourceId: 'open-food-facts',
          }),
        ],
      },
    });
    expect(fetchOpenFoodFactsProductByBarcode).toHaveBeenCalledWith('049000028911');
  });
});
