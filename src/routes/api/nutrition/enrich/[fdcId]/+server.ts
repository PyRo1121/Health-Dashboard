import { createDbPostHandler } from '$lib/server/http/action-route';
import {
  foodLookupResultFromCatalogItem,
  type FoodLookupResult,
  upsertFoodCatalogItem,
} from '$lib/features/nutrition/service';
import { fetchUsdaFoodDetail, normalizeUsdaFoodDetail } from '$lib/server/nutrition/usda';

export const POST = createDbPostHandler<void, FoodLookupResult>(
  async (db, _body, { params }) => {
    const fdcId = params.fdcId;
    if (!fdcId) {
      throw new Error('USDA food id is required.');
    }

    const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;
    if (!apiKey) {
      throw new Error('USDA API key is not configured.');
    }

    const detail = await fetchUsdaFoodDetail(fdcId, apiKey);
    const existing = await db.foodCatalogItems.get(`usda:${fdcId}`);
    const normalized = normalizeUsdaFoodDetail(detail, existing);
    return foodLookupResultFromCatalogItem(await upsertFoodCatalogItem(db, normalized));
  },
  undefined,
  {
    parseBody: async () => undefined,
    onActionError: (error) => {
      const message = error instanceof Error ? error.message : 'USDA enrich failed.';
      return new Response(message, { status: message.includes('not configured') ? 503 : 500 });
    },
  }
);
