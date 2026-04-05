import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FoodLookupResult } from '$lib/features/nutrition/service';

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
});
