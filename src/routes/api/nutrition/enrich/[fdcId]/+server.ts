import type { RequestHandler } from './$types';
import { nutritionEnrichParamsSchema } from '$lib/features/nutrition/contracts';
import type { FoodLookupResult } from '$lib/features/nutrition/types';
import { enrichNutritionFoodServer } from '$lib/server/nutrition/service';

export const POST: RequestHandler = async ({ params }) => {
  const parsedParams = nutritionEnrichParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return new Response('Invalid USDA food id.', { status: 400 });
  }
  const { fdcId } = parsedParams.data;

  try {
    return Response.json((await enrichNutritionFoodServer(fdcId)) satisfies FoodLookupResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'USDA enrich failed.';
    return new Response(message, { status: message === 'USDA API key is not configured.' ? 503 : 500 });
  }
};
