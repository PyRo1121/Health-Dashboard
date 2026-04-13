import type { FoodLookupResult } from '$lib/features/nutrition/types';
import type { FoodCatalogItem, RecipeCatalogItem } from '$lib/core/domain/types';
import {
  findFoodCatalogItemByBarcode,
  foodLookupResultFromCatalogItem,
  searchFoodData,
  searchLocalFoodCatalog,
  searchPackagedFoodCatalog,
} from '$lib/features/nutrition/lookup';
import { type NutritionPageState } from '$lib/features/nutrition/state';
import {
  upsertFoodCatalogItemServer,
  upsertRecipeCatalogItemServer,
} from '$lib/server/nutrition/catalog-store';
import { refreshNutritionPageAfterMutationServer } from '$lib/server/nutrition/page-loader';
import {
  fetchOpenFoodFactsProductByBarcode,
  normalizeOpenFoodFactsBarcode,
  normalizeOpenFoodFactsProduct,
  searchOpenFoodFactsProducts,
} from '$lib/server/nutrition/open-food-facts';
import {
  searchUsdaFoods,
  fetchUsdaFoodDetail,
  normalizeUsdaFoodDetail,
} from '$lib/server/nutrition/usda';
import { searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';
import {
  listFoodCatalogItemsServer,
  listRecipeCatalogItemsServer,
} from '$lib/server/planning/store';
export {
  clearNutritionPlannedMealServer,
  planNutritionMealServer,
  reuseNutritionMealServer,
  saveNutritionMealServer,
  saveNutritionRecurringMealServer,
} from '$lib/server/nutrition/meal-mutations';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordById } from '$lib/server/db/drizzle/mirror';

export { loadNutritionPageServer } from '$lib/server/nutrition/page-loader';

export type SearchUsdaResponse = {
  matches: FoodLookupResult[];
  notice?: string;
};

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

export async function saveNutritionCatalogItemServer(
  state: NutritionPageState,
  draft: {
    name: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
  }
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return { ...state, saveNotice: 'Custom food name is required.' };
  }

  const timestamp = new Date().toISOString();
  await upsertFoodCatalogItemServer({
    id: `food-catalog-${crypto.randomUUID()}`,
    name: draft.name.trim(),
    sourceType: 'custom',
    sourceName: 'Local catalog',
    externalId: undefined,
    brandName: undefined,
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
    imageUrl: undefined,
    ingredientsText: undefined,
    servingAmount: undefined,
    servingUnit: undefined,
    lastVerifiedAt: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return await refreshNutritionPageAfterMutationServer(state, {
    saveNotice: 'Saved to custom food catalog.',
  });
}

export async function searchPackagedFoodsServer(query: string): Promise<FoodLookupResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const localMatches = searchPackagedFoodCatalog(normalizedQuery, catalogItems);
  const remoteProducts = await searchOpenFoodFactsProducts(normalizedQuery);
  const remoteMatches: FoodLookupResult[] = [];

  for (const product of remoteProducts) {
    const normalized = normalizeOpenFoodFactsProduct(product);
    if (!normalized) continue;
    const cached = await upsertFoodCatalogItemServer(normalized);
    remoteMatches.push(foodLookupResultFromCatalogItem(cached));
  }

  return dedupeLookupResults([...localMatches, ...remoteMatches]);
}

export async function searchUsdaFoodsServer(query: string): Promise<SearchUsdaResponse> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return { matches: [] };
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const localMatches = searchLocalFoodCatalog(normalizedQuery, catalogItems);
  const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;

  if (!apiKey) {
    return {
      matches: searchFoodData(normalizedQuery, catalogItems),
      notice: 'USDA live search unavailable, using local fallback foods.',
    };
  }

  const remoteMatches = await searchUsdaFoods(normalizedQuery, apiKey);
  return {
    matches: dedupeLookupResults([...localMatches, ...remoteMatches]),
    notice: remoteMatches.length ? '' : 'No USDA matches found, showing local results only.',
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
  const remoteMatches = await searchThemealdbRecipes(normalizedQuery);
  const cachedRemoteMatches = await Promise.all(
    remoteMatches.map((recipe) => upsertRecipeCatalogItemServer(recipe))
  );

  return dedupeRecipesById([...localMatches, ...cachedRemoteMatches]);
}

export async function lookupNutritionBarcodeServer(code: string): Promise<FoodLookupResult | null> {
  const barcode = normalizeOpenFoodFactsBarcode(code);
  if (!barcode) {
    return null;
  }

  const catalogItems = await listFoodCatalogItemsServer();
  const local = findFoodCatalogItemByBarcode(barcode, catalogItems);
  if (local) {
    return local;
  }

  const product = await fetchOpenFoodFactsProductByBarcode(barcode);
  if (!product) return null;

  const normalized = normalizeOpenFoodFactsProduct(product);
  if (!normalized) return null;

  return foodLookupResultFromCatalogItem(await upsertFoodCatalogItemServer(normalized));
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
