import { createDbQueryPostHandler } from '$lib/server/http/action-route';
import {
  nutritionQueryRequestSchema,
  type NutritionQueryRequest,
} from '$lib/features/nutrition/contracts';
import {
  listFoodCatalogItems,
  searchFoodData,
  searchLocalFoodCatalog,
  type FoodLookupResult,
} from '$lib/features/nutrition/service';
import { searchUsdaFoods } from '$lib/server/nutrition/usda';

type SearchUsdaResponse = {
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

export const POST = createDbQueryPostHandler<NutritionQueryRequest, SearchUsdaResponse>(
  async (db, query) => {
    const catalogItems = await listFoodCatalogItems(db);
    const localMatches = searchLocalFoodCatalog(query, catalogItems);
    const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;

    if (!apiKey) {
      return {
        matches: searchFoodData(query, catalogItems),
        notice: 'USDA live search unavailable, using local fallback foods.',
      } satisfies SearchUsdaResponse;
    }

    const remoteMatches = await searchUsdaFoods(query, apiKey);
    return {
      matches: dedupeLookupResults([...localMatches, ...remoteMatches]),
      notice: remoteMatches.length ? '' : 'No USDA matches found, showing local results only.',
    } satisfies SearchUsdaResponse;
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = nutritionQueryRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid USDA search request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid USDA search request payload.', { status: 400 }),
    emptyResult: { matches: [] },
  }
);
