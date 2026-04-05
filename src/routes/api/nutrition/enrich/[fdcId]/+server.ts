import { createDbPostHandler } from '$lib/server/http/action-route';
import { nutritionEnrichParamsSchema } from '$lib/features/nutrition/contracts';
import {
  foodLookupResultFromCatalogItem,
  type FoodLookupResult,
  upsertFoodCatalogItem,
} from '$lib/features/nutrition/service';
import { fetchUsdaFoodDetail, normalizeUsdaFoodDetail } from '$lib/server/nutrition/usda';

export const POST = createDbPostHandler<void, FoodLookupResult>(
  async (db, _body, { params }) => {
    const parsedParams = nutritionEnrichParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new Error('Invalid USDA food id.');
    }
    const { fdcId } = parsedParams.data;

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
      if (message === 'Invalid USDA food id.') {
        return new Response(message, { status: 400 });
      }
      return new Response(message, { status: message.includes('not configured') ? 503 : 500 });
    },
  }
);
