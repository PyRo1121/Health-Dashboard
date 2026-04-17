import { afterEach, describe, expect, it, vi } from 'vitest';

describe('nutrition dynamic routes', () => {
  afterEach(() => {
    delete process.env.USDA_FDC_API_KEY;
    delete process.env.FDC_API_KEY;
    vi.doUnmock('$lib/server/nutrition/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns a cached barcode hit before calling remote enrichment', async () => {
    const lookupNutritionBarcodeServer = vi.fn(async () => ({
      match: {
        id: 'off:049000028911',
        name: 'Diet Cola',
      },
      notice: 'Packaged food loaded from local cache.',
      metadata: {
        provenance: [
          {
            sourceId: 'open-food-facts',
            sourceName: 'Open Food Facts',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'local-cache',
        degradationStatus: 'none',
      },
    }));
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer,
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/barcode/[code]/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/barcode/049000028911', {
        method: 'POST',
      }),
      params: { code: '049000028911' },
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      match: {
        id: 'off:049000028911',
        name: 'Diet Cola',
      },
      notice: 'Packaged food loaded from local cache.',
      metadata: {
        provenance: [
          {
            sourceId: 'open-food-facts',
            sourceName: 'Open Food Facts',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'local-cache',
        degradationStatus: 'none',
      },
    });
    expect(lookupNutritionBarcodeServer).toHaveBeenCalledWith('049000028911');
  });

  it('returns a barcode miss envelope unchanged', async () => {
    const lookupNutritionBarcodeServer = vi.fn(async () => ({
      match: null,
      metadata: {
        provenance: [
          {
            sourceId: 'open-food-facts',
            sourceName: 'Open Food Facts',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    }));
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer,
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/barcode/[code]/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/barcode/000', {
        method: 'POST',
      }),
      params: { code: '000' },
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      match: null,
      metadata: {
        provenance: [
          {
            sourceId: 'open-food-facts',
            sourceName: 'Open Food Facts',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'none',
        degradationStatus: 'none',
      },
    });
  });

  it('maps missing USDA API keys to a 503 enrich response', async () => {
    const enrichNutritionFoodServer = vi.fn(async () => {
      throw new Error('USDA API key is not configured.');
    });
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer,
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/enrich/[fdcId]/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/enrich/12345', {
        method: 'POST',
      }),
      params: { fdcId: '12345' },
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('USDA API key is not configured.');
    expect(enrichNutritionFoodServer).toHaveBeenCalledWith('12345');
  });

  it('uses the direct packaged search service', async () => {
    const searchPackagedFoodsServer = vi.fn(async () => [
      { id: 'off:049000028911', name: 'Diet Cola' },
    ]);
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer,
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } =
      await import('../../../../src/routes/api/nutrition/search-packaged/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-packaged', {
        method: 'POST',
        body: JSON.stringify({ query: 'cola' }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: 'off:049000028911', name: 'Diet Cola' }]);
    expect(searchPackagedFoodsServer).toHaveBeenCalledWith('cola');
  });

  it('returns 400 for invalid packaged search payloads', async () => {
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } =
      await import('../../../../src/routes/api/nutrition/search-packaged/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-packaged', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid packaged search request payload.');
  });

  it('uses the direct USDA search service', async () => {
    const searchUsdaFoodsServer = vi.fn(async () => ({
      matches: [{ id: 'fdc-oatmeal', name: 'Oatmeal with berries' }],
      notice: 'USDA live search unavailable, using local fallback foods.',
      metadata: {
        provenance: [
          {
            sourceId: 'usda-fooddata-central',
            sourceName: 'USDA FoodData Central',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
      },
    }));
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer,
      searchRecipesServer: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/search-usda/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-usda', {
        method: 'POST',
        body: JSON.stringify({ query: 'oatmeal' }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      matches: [{ id: 'fdc-oatmeal', name: 'Oatmeal with berries' }],
      notice: 'USDA live search unavailable, using local fallback foods.',
      metadata: {
        provenance: [
          {
            sourceId: 'usda-fooddata-central',
            sourceName: 'USDA FoodData Central',
            category: 'nutrition',
            productionPosture: 'adopt',
          },
        ],
        cacheStatus: 'local-cache',
        degradationStatus: 'degraded',
      },
    });
    expect(searchUsdaFoodsServer).toHaveBeenCalledWith('oatmeal');
  });

  it('returns 400 for invalid USDA search payloads', async () => {
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/search-usda/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-usda', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid USDA search request payload.');
  });

  it('uses the direct recipe search service', async () => {
    const searchRecipesServer = vi.fn(async () => [
      { id: 'themealdb:52772', title: 'Teriyaki Chicken Casserole' },
      { id: 'themealdb:52900', title: 'Chicken Handi' },
    ]);
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer,
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/search-recipes/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-recipes', {
        method: 'POST',
        body: JSON.stringify({ query: 'chicken' }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 'themealdb:52772', title: 'Teriyaki Chicken Casserole' },
      { id: 'themealdb:52900', title: 'Chicken Handi' },
    ]);
    expect(searchRecipesServer).toHaveBeenCalledWith('chicken');
  });

  it('returns 400 for invalid recipe search payloads', async () => {
    vi.doMock('$lib/server/nutrition/service', () => ({
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/search-recipes/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-recipes', {
        method: 'POST',
        body: JSON.stringify({ query: 42 }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid recipe search request payload.');
  });
});
