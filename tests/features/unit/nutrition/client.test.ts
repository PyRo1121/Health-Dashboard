import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FoodLookupResult } from '$lib/features/nutrition/types';

describe('nutrition client', () => {
  afterEach(() => {
    vi.doUnmock('$lib/core/http/feature-client');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('enriches a deferred USDA match through a dynamic request client endpoint', async () => {
    const requestSpies = new Map<string, ReturnType<typeof vi.fn>>();
    const createFeatureRequestClient = vi.fn((endpoint: string) => {
      const request = vi.fn(
        async () =>
          ({
            id: 'usda-search:12345',
            name: 'Chicken breast, roasted',
            calories: 180,
            protein: 32,
            fiber: 0,
            carbs: 0,
            fat: 6,
            sourceName: 'USDA FoodData Central',
            sourceType: 'usda-fallback' as const,
            externalId: '12345',
            isEnriched: true,
          }) satisfies FoodLookupResult
      );
      requestSpies.set(endpoint, request);
      return { request };
    });
    const createFeatureActionClient = vi.fn(() => ({
      action: vi.fn(),
      stateAction: vi.fn(),
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
      createFeatureRequestClient,
      runFeatureMode: async (_runTest: () => Promise<unknown>, runApi: () => Promise<unknown>) =>
        await runApi(),
    }));

    const { createNutritionPageState, useNutritionMatch } =
      await import('../../../../src/lib/features/nutrition/client.ts');
    createFeatureRequestClient.mockClear();
    requestSpies.clear();

    const state = {
      ...createNutritionPageState(),
      localDay: '2026-04-03',
    };
    const match: FoodLookupResult = {
      id: 'usda-search:12345',
      name: 'Chicken breast',
      calories: 0,
      protein: 0,
      fiber: 0,
      carbs: 0,
      fat: 0,
      sourceName: 'USDA FoodData Central',
      sourceType: 'usda-fallback',
      externalId: '12345',
      isEnriched: false,
    };

    const next = await useNutritionMatch(state, match);

    expect(createFeatureRequestClient).toHaveBeenCalledWith('/api/nutrition/enrich/12345');
    expect(requestSpies.get('/api/nutrition/enrich/12345')).toHaveBeenCalledWith(
      {},
      expect.any(Function)
    );
    expect(next.searchNotice).toBe('USDA result enriched and cached locally.');
    expect(next.selectedMatch).toMatchObject({
      name: 'Chicken breast, roasted',
      isEnriched: true,
    });
    expect(next.form.name).toBe('Chicken breast, roasted');
  });

  it('looks up packaged barcode hits through a dynamic request client endpoint', async () => {
    const requestSpies = new Map<string, ReturnType<typeof vi.fn>>();
    const createFeatureRequestClient = vi.fn((endpoint: string) => {
      const request = vi.fn(
        async () =>
          ({
            match: {
              id: 'off:049000028911',
              name: 'Diet Cola',
              calories: 1,
              protein: 0,
              fiber: 0,
              carbs: 0,
              fat: 0,
              sourceName: 'Open Food Facts',
              sourceType: 'open-food-facts' as const,
              barcode: '049000028911',
              isEnriched: true,
            } satisfies FoodLookupResult,
            notice: 'Packaged food loaded from local cache.',
            metadata: {
              provenance: [],
              cacheStatus: 'local-cache' as const,
              degradationStatus: 'none' as const,
            },
          })
      );
      requestSpies.set(endpoint, request);
      return { request };
    });
    const createFeatureActionClient = vi.fn(() => ({
      action: vi.fn(),
      stateAction: vi.fn(),
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
      createFeatureRequestClient,
    }));

    const { createNutritionPageState, lookupPackagedBarcode } =
      await import('../../../../src/lib/features/nutrition/client.ts');
    createFeatureRequestClient.mockClear();
    requestSpies.clear();

    const state = {
      ...createNutritionPageState(),
      localDay: '2026-04-03',
      barcodeQuery: '049000028911',
    };

    const next = await lookupPackagedBarcode(state);

    expect(createFeatureRequestClient).toHaveBeenCalledWith('/api/nutrition/barcode/049000028911');
    expect(requestSpies.get('/api/nutrition/barcode/049000028911')).toHaveBeenCalledWith(
      {},
      expect.any(Function)
    );
    expect(next.packagedNotice).toBe('Packaged food loaded from barcode.');
    expect(next.selectedMatch).toMatchObject({
      name: 'Diet Cola',
    });
    expect(next.form.name).toBe('Diet Cola');
  });

  it('does not surface custom local foods as USDA-backed fallback matches in client mode', async () => {
    const createFeatureRequestClient = vi.fn(() => ({
      request: vi.fn(async (_input, runFallback) => await runFallback(useFakeDb())),
    }));
    const createFeatureActionClient = vi.fn(() => ({
      action: vi.fn(),
      stateAction: vi.fn(),
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
      createFeatureRequestClient,
    }));
    vi.doMock('$lib/features/nutrition/store', () => ({
      listFoodCatalogItems: vi.fn(async () => [
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
      listRecipeCatalogItems: vi.fn(async () => []),
    }));

    const { createNutritionPageState, searchNutritionFoods } =
      await import('../../../../src/lib/features/nutrition/client.ts');

    const next = await searchNutritionFoods({
      ...createNutritionPageState(),
      localDay: '2026-04-03',
      searchQuery: 'oatmeal',
    });

    expect(next.matches).toEqual([
      expect.objectContaining({
        id: 'fdc-oatmeal',
        name: 'Oatmeal with berries',
        sourceName: 'USDA fallback',
      }),
    ]);
    expect(next.matches.find((match) => match.id === 'food-catalog-1')).toBeUndefined();
  });

  it('does not select custom local barcode hits as packaged-food fallback matches in client mode', async () => {
    const createFeatureRequestClient = vi.fn(() => ({
      request: vi.fn(async (_input, runFallback) => await runFallback(useFakeDb())),
    }));
    const createFeatureActionClient = vi.fn(() => ({
      action: vi.fn(),
      stateAction: vi.fn(),
    }));

    vi.doMock('$lib/core/http/feature-client', () => ({
      createFeatureActionClient,
      createFeatureRequestClient,
    }));
    vi.doMock('$lib/features/nutrition/store', () => ({
      listFoodCatalogItems: vi.fn(async () => [
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
      listRecipeCatalogItems: vi.fn(async () => []),
    }));

    const { createNutritionPageState, lookupPackagedBarcode } =
      await import('../../../../src/lib/features/nutrition/client.ts');

    const next = await lookupPackagedBarcode({
      ...createNutritionPageState(),
      localDay: '2026-04-03',
      barcodeQuery: '049000028911',
    });

    expect(next.selectedMatch).toBeNull();
    expect(next.form.name).toBe('');
    expect(next.packagedNotice).toBe('Packaged food loaded from local cache.');
  });
});

function useFakeDb() {
  return {} as never;
}
