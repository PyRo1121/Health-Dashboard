import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthDatabase } from '$lib/core/db/types';

async function mockServerDb(db: HealthDatabase = {} as HealthDatabase) {
  vi.doMock('$lib/server/db/client', () => ({
    withServerHealthDb: async <Result>(run: (database: HealthDatabase) => Promise<Result>) =>
      await run(db),
  }));

  return db;
}

describe('nutrition dynamic routes', () => {
  afterEach(() => {
    delete process.env.USDA_FDC_API_KEY;
    delete process.env.FDC_API_KEY;
    vi.doUnmock('$lib/server/db/client');
    vi.doUnmock('$lib/features/nutrition/service');
    vi.doUnmock('$lib/server/nutrition/open-food-facts');
    vi.doUnmock('$lib/server/nutrition/usda');
    vi.doUnmock('$lib/server/nutrition/themealdb');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns a cached barcode hit before calling Open Food Facts', async () => {
    const db = await mockServerDb();
    const listFoodCatalogItems = vi.fn(async () => [
      { id: 'off:049000028911', barcode: '049000028911', name: 'Diet Cola' },
    ]);
    const foodLookupResultFromCatalogItem = vi.fn(() => ({
      id: 'off:049000028911',
      name: 'Diet Cola',
    }));
    const upsertFoodCatalogItem = vi.fn();
    const fetchOpenFoodFactsProductByBarcode = vi.fn();
    const normalizeOpenFoodFactsBarcode = vi.fn((code: string) => code.replace(/\D+/g, ''));
    const normalizeOpenFoodFactsProduct = vi.fn();

    vi.doMock('$lib/features/nutrition/service', () => ({
      listFoodCatalogItems,
      foodLookupResultFromCatalogItem,
      upsertFoodCatalogItem,
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      fetchOpenFoodFactsProductByBarcode,
      normalizeOpenFoodFactsBarcode,
      normalizeOpenFoodFactsProduct,
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
      id: 'off:049000028911',
      name: 'Diet Cola',
    });
    expect(listFoodCatalogItems).toHaveBeenCalledWith(db);
    expect(fetchOpenFoodFactsProductByBarcode).not.toHaveBeenCalled();
    expect(upsertFoodCatalogItem).not.toHaveBeenCalled();
  });

  it('maps missing USDA API keys to a 503 enrich response', async () => {
    await mockServerDb();
    const fetchUsdaFoodDetail = vi.fn();
    const normalizeUsdaFoodDetail = vi.fn();

    vi.doMock('$lib/features/nutrition/service', () => ({
      foodLookupResultFromCatalogItem: vi.fn(),
      upsertFoodCatalogItem: vi.fn(),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail,
      normalizeUsdaFoodDetail,
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
    expect(fetchUsdaFoodDetail).not.toHaveBeenCalled();
    expect(normalizeUsdaFoodDetail).not.toHaveBeenCalled();
  });

  it('dedupes packaged search results across local and remote matches', async () => {
    const db = await mockServerDb();
    const localMatch = { id: 'off:049000028911', name: 'Diet Cola' };
    const remoteProduct = { code: '049000028911' };
    const normalizedProduct = { id: 'off:049000028911', name: 'Diet Cola' };

    const listFoodCatalogItems = vi.fn(async () => [{ id: 'off:049000028911' }]);
    const searchPackagedFoodCatalog = vi.fn(() => [localMatch]);
    const upsertFoodCatalogItem = vi.fn(async () => normalizedProduct);
    const foodLookupResultFromCatalogItem = vi.fn((item) => item);
    const searchOpenFoodFactsProducts = vi.fn(async () => [remoteProduct]);
    const normalizeOpenFoodFactsProduct = vi.fn(() => normalizedProduct);

    vi.doMock('$lib/features/nutrition/service', () => ({
      listFoodCatalogItems,
      searchPackagedFoodCatalog,
      upsertFoodCatalogItem,
      foodLookupResultFromCatalogItem,
    }));
    vi.doMock('$lib/server/nutrition/open-food-facts', () => ({
      searchOpenFoodFactsProducts,
      normalizeOpenFoodFactsProduct,
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
    expect(await response.json()).toEqual([localMatch]);
    expect(listFoodCatalogItems).toHaveBeenCalledWith(db);
    expect(searchPackagedFoodCatalog).toHaveBeenCalledWith('cola', [{ id: 'off:049000028911' }]);
    expect(searchOpenFoodFactsProducts).toHaveBeenCalledWith('cola');
    expect(upsertFoodCatalogItem).toHaveBeenCalledWith(db, normalizedProduct);
  });

  it('returns 400 for invalid packaged search payloads', async () => {
    await mockServerDb();

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

  it('uses local USDA fallback search when no API key is present', async () => {
    const db = await mockServerDb();
    const catalogItems = [{ id: 'local-food-1', name: 'Oatmeal with berries' }];
    const listFoodCatalogItems = vi.fn(async () => catalogItems);
    const searchLocalFoodCatalog = vi.fn(() => []);
    const searchFoodData = vi.fn(() => [{ id: 'fdc-oatmeal', name: 'Oatmeal with berries' }]);
    const searchUsdaFoods = vi.fn();

    vi.doMock('$lib/features/nutrition/service', () => ({
      listFoodCatalogItems,
      searchLocalFoodCatalog,
      searchFoodData,
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      searchUsdaFoods,
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
    });
    expect(listFoodCatalogItems).toHaveBeenCalledWith(db);
    expect(searchLocalFoodCatalog).toHaveBeenCalledWith('oatmeal', catalogItems);
    expect(searchFoodData).toHaveBeenCalledWith('oatmeal', catalogItems);
    expect(searchUsdaFoods).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid USDA search payloads', async () => {
    await mockServerDb();

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

  it('merges cached and remote recipe search results', async () => {
    const db = await mockServerDb();
    const localRecipe = { id: 'themealdb:52772', title: 'Teriyaki Chicken Casserole' };
    const remoteRecipe = { id: 'themealdb:52900', title: 'Chicken Handi' };

    const listRecipeCatalogItems = vi.fn(async () => [localRecipe]);
    const searchThemealdbRecipes = vi.fn(async () => [remoteRecipe]);
    const upsertRecipeCatalogItem = vi.fn(
      async (_db: HealthDatabase, recipe: typeof remoteRecipe) => recipe
    );

    vi.doMock('$lib/features/nutrition/service', () => ({
      listRecipeCatalogItems,
      upsertRecipeCatalogItem,
    }));
    vi.doMock('$lib/server/nutrition/themealdb', () => ({
      searchThemealdbRecipes,
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/search-recipes/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/search-recipes', {
        method: 'POST',
        body: JSON.stringify({ query: 'chicken' }),
      }),
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([localRecipe, remoteRecipe]);
    expect(listRecipeCatalogItems).toHaveBeenCalledWith(db);
    expect(searchThemealdbRecipes).toHaveBeenCalledWith('chicken');
    expect(upsertRecipeCatalogItem).toHaveBeenCalledWith(db, remoteRecipe);
  });

  it('returns 400 for invalid recipe search payloads', async () => {
    await mockServerDb();

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

  it('maps invalid USDA ids to a 400 enrich response', async () => {
    await mockServerDb();
    const fetchUsdaFoodDetail = vi.fn();
    const normalizeUsdaFoodDetail = vi.fn();

    vi.doMock('$lib/features/nutrition/service', () => ({
      foodLookupResultFromCatalogItem: vi.fn(),
      upsertFoodCatalogItem: vi.fn(),
    }));
    vi.doMock('$lib/server/nutrition/usda', () => ({
      fetchUsdaFoodDetail,
      normalizeUsdaFoodDetail,
    }));

    const { POST } = await import('../../../../src/routes/api/nutrition/enrich/[fdcId]/+server.ts');
    const response = await POST({
      request: new Request('http://health.test/api/nutrition/enrich/not-a-number', {
        method: 'POST',
      }),
      params: { fdcId: 'not-a-number' },
    } as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid USDA food id.');
    expect(fetchUsdaFoodDetail).not.toHaveBeenCalled();
    expect(normalizeUsdaFoodDetail).not.toHaveBeenCalled();
  });
});
