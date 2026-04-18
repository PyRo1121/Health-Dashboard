import type { FoodCatalogItem, RecipeCatalogItem } from '$lib/core/domain/types';
import type { FoodLookupResult } from '$lib/features/nutrition/types';
import {
  findFoodCatalogItemByBarcode,
  foodLookupResultFromCatalogItem,
  searchFoodData,
  searchLocalFoodCatalog,
  searchPackagedFoodCatalog,
} from '$lib/features/nutrition/lookup';
import {
  upsertFoodCatalogItemServer,
  upsertRecipeCatalogItemServer,
} from '$lib/server/nutrition/catalog-store';
import {
  fetchOpenFoodFactsProductByBarcode,
  normalizeOpenFoodFactsBarcode,
  normalizeOpenFoodFactsProduct,
  searchOpenFoodFactsProducts,
} from '$lib/server/nutrition/open-food-facts';
import { searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';
import {
  fetchUsdaFoodDetail,
  normalizeUsdaFoodDetail,
  searchUsdaFoods,
} from '$lib/server/nutrition/usda';
import {
  listFoodCatalogItemsServer,
  listRecipeCatalogItemsServer,
} from '$lib/server/planning/store';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordById } from '$lib/server/db/drizzle/mirror';
import {
  createExternalSourceMetadata,
  type ExternalSourceMetadata,
} from '$lib/core/domain/external-sources';

export interface SourceSearchResponse<T> {
  matches: T[];
  notice?: string;
  metadata: ExternalSourceMetadata;
}

export interface SourceLookupResponse<T> {
  match: T | null;
  notice?: string;
  metadata: ExternalSourceMetadata;
}

export type SearchUsdaResponse = SourceSearchResponse<FoodLookupResult>;
export type SearchPackagedResponse = SourceSearchResponse<FoodLookupResult>;
export type BarcodeLookupResponse = SourceLookupResponse<FoodLookupResult>;

function dedupeLookupResults(items: FoodLookupResult[]): FoodLookupResult[] {
  const deduped = new Map<string, FoodLookupResult>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

function dedupeRecipesById(items: RecipeCatalogItem[]): RecipeCatalogItem[] {
  const deduped = new Map<string, RecipeCatalogItem>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

function usdaLocalCatalogItems(items: FoodCatalogItem[]): FoodCatalogItem[] {
  return items.filter((item) => item.sourceType === 'usda-fallback');
}

function openFoodFactsCatalogItems(items: FoodCatalogItem[]): FoodCatalogItem[] {
  return items.filter((item) => item.sourceType === 'open-food-facts');
}

export async function searchPackagedFoodsServer(query: string): Promise<SearchPackagedResponse> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      matches: [],
      metadata: createExternalSourceMetadata('open-food-facts', 'none', 'none'),
    };
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const localMatches = searchPackagedFoodCatalog(normalizedQuery, catalogItems);
  const remoteProducts = await (async () => {
    try {
      return await searchOpenFoodFactsProducts(normalizedQuery);
    } catch {
      return null;
    }
  })();
  if (!remoteProducts) {
    return {
      matches: localMatches,
      notice: 'Open Food Facts search unavailable, using local packaged foods.',
      metadata: createExternalSourceMetadata('open-food-facts', 'local-cache', 'degraded'),
    };
  }

  const remoteMatches: FoodLookupResult[] = [];

  for (const product of remoteProducts) {
    const normalized = normalizeOpenFoodFactsProduct(product);
    if (!normalized) continue;
    const cached = await upsertFoodCatalogItemServer(normalized);
    remoteMatches.push(foodLookupResultFromCatalogItem(cached));
  }

  const matches = dedupeLookupResults([...localMatches, ...remoteMatches]);

  return {
    matches,
    metadata: createExternalSourceMetadata(
      'open-food-facts',
      remoteMatches.length > 0 ? 'remote-live' : localMatches.length > 0 ? 'local-cache' : 'none',
      'none'
    ),
  };
}

export async function searchUsdaFoodsServer(query: string): Promise<SearchUsdaResponse> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return {
      matches: [],
      metadata: createExternalSourceMetadata('usda-fooddata-central', 'none', 'none'),
    };
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const localMatches = searchLocalFoodCatalog(normalizedQuery, usdaLocalCatalogItems(catalogItems));
  const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;

  if (!apiKey) {
    return {
      matches: searchFoodData(normalizedQuery, usdaLocalCatalogItems(catalogItems)),
      notice: 'USDA live search unavailable, using local fallback foods.',
      metadata: createExternalSourceMetadata('usda-fooddata-central', 'local-cache', 'degraded'),
    };
  }

  const remoteMatches = await (async () => {
    try {
      return await searchUsdaFoods(normalizedQuery, apiKey);
    } catch {
      return null;
    }
  })();

  if (!remoteMatches) {
    return {
      matches: searchFoodData(normalizedQuery, usdaLocalCatalogItems(catalogItems)),
      notice: 'USDA live search unavailable, using local fallback foods.',
      metadata: createExternalSourceMetadata('usda-fooddata-central', 'local-cache', 'degraded'),
    };
  }

  return {
    matches: dedupeLookupResults([...localMatches, ...remoteMatches]),
    notice: remoteMatches.length ? '' : 'No USDA matches found, showing local results only.',
    metadata: createExternalSourceMetadata(
      'usda-fooddata-central',
      remoteMatches.length > 0 ? 'remote-live' : localMatches.length > 0 ? 'local-cache' : 'none',
      'none'
    ),
  };
}

export async function searchRecipesServer(query: string): Promise<RecipeCatalogItem[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const localMatches = (await listRecipeCatalogItemsServer()).filter((recipe) =>
    recipe.title.toLowerCase().includes(normalizedQuery.toLowerCase())
  );
  const remoteMatches = await (async (): Promise<RecipeCatalogItem[] | null> => {
    try {
      return await searchThemealdbRecipes(normalizedQuery);
    } catch {
      return null;
    }
  })();
  if (!remoteMatches) {
    return localMatches;
  }

  const cachedRemoteMatches = await Promise.all(
    remoteMatches.map((recipe) => upsertRecipeCatalogItemServer(recipe))
  );

  return dedupeRecipesById([...localMatches, ...cachedRemoteMatches]);
}

export async function lookupNutritionBarcodeServer(code: string): Promise<BarcodeLookupResponse> {
  const barcode = normalizeOpenFoodFactsBarcode(code);
  if (!barcode) {
    return {
      match: null,
      metadata: createExternalSourceMetadata('open-food-facts', 'none', 'none'),
    };
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const local = findFoodCatalogItemByBarcode(barcode, openFoodFactsCatalogItems(catalogItems));
  if (local) {
    return {
      match: local,
      notice: 'Packaged food loaded from local cache.',
      metadata: createExternalSourceMetadata('open-food-facts', 'local-cache', 'none'),
    };
  }

  let product: Awaited<ReturnType<typeof fetchOpenFoodFactsProductByBarcode>>;

  try {
    product = await fetchOpenFoodFactsProductByBarcode(barcode);
  } catch {
    return {
      match: null,
      metadata: createExternalSourceMetadata('open-food-facts', 'none', 'degraded'),
    };
  }

  if (!product) {
    return {
      match: null,
      metadata: createExternalSourceMetadata('open-food-facts', 'none', 'none'),
    };
  }

  const normalized = normalizeOpenFoodFactsProduct(product);
  if (!normalized) {
    return {
      match: null,
      metadata: createExternalSourceMetadata('open-food-facts', 'none', 'degraded'),
    };
  }

  return {
    match: foodLookupResultFromCatalogItem(await upsertFoodCatalogItemServer(normalized)),
    notice: 'Packaged food loaded from Open Food Facts.',
    metadata: createExternalSourceMetadata('open-food-facts', 'remote-live', 'none'),
  };
}

export async function enrichNutritionFoodServer(fdcId: string): Promise<FoodLookupResult> {
  const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;
  if (!apiKey) {
    throw new Error('USDA API key is not configured.');
  }

  const detail = await fetchUsdaFoodDetail(fdcId, apiKey);
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<FoodCatalogItem>(
    db,
    drizzleSchema.foodCatalogItems,
    `usda:${fdcId}`
  );
  const normalized = normalizeUsdaFoodDetail(detail, existing);
  const item = await upsertFoodCatalogItemServer(normalized);
  return foodLookupResultFromCatalogItem(item);
}
