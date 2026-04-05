import { createDbQueryPostHandler } from '$lib/server/http/action-route';
import {
  foodLookupResultFromCatalogItem,
  listFoodCatalogItems,
  searchPackagedFoodCatalog,
  type FoodLookupResult,
  upsertFoodCatalogItem,
} from '$lib/features/nutrition/service';
import {
  normalizeOpenFoodFactsProduct,
  searchOpenFoodFactsProducts,
} from '$lib/server/nutrition/open-food-facts';

type PackagedSearchRequest = { query?: string };

function dedupeLookupResults(items: FoodLookupResult[]): FoodLookupResult[] {
  const deduped = new Map<string, FoodLookupResult>();
  for (const item of items) {
    deduped.set(item.id, item);
  }
  return [...deduped.values()];
}

export const POST = createDbQueryPostHandler<PackagedSearchRequest, FoodLookupResult[]>(
  async (db, query) => {
    const catalogItems = await listFoodCatalogItems(db);
    const localMatches = searchPackagedFoodCatalog(query, catalogItems);
    const remoteProducts = await searchOpenFoodFactsProducts(query);
    const remoteMatches: FoodLookupResult[] = [];

    for (const product of remoteProducts) {
      const normalized = normalizeOpenFoodFactsProduct(product);
      if (!normalized) continue;
      const cached = await upsertFoodCatalogItem(db, normalized);
      remoteMatches.push(foodLookupResultFromCatalogItem(cached));
    }

    return dedupeLookupResults([...localMatches, ...remoteMatches]);
  },
  undefined,
  {
    emptyResult: [],
  }
);
