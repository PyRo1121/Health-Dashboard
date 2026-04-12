import type { RequestHandler } from './$types';
import { nutritionRequestSchema } from '$lib/features/nutrition/contracts';
import {
  clearNutritionPlannedMealServer,
  loadNutritionPageServer,
  planNutritionMealServer,
  reuseNutritionMealServer,
  saveNutritionCatalogItemServer,
  saveNutritionMealServer,
  saveNutritionRecurringMealServer,
} from '$lib/server/nutrition/service';

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response('Invalid nutrition request payload.', { status: 400 });
  }

  const parsed = nutritionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response('Invalid nutrition request payload.', { status: 400 });
  }

  switch (parsed.data.action) {
    case 'load':
      return Response.json(await loadNutritionPageServer(parsed.data.localDay, parsed.data.state));
    case 'saveMeal':
      return Response.json(await saveNutritionMealServer(parsed.data.state, parsed.data.draft));
    case 'planMeal':
      return Response.json(await planNutritionMealServer(parsed.data.state, parsed.data.draft));
    case 'saveRecurringMeal':
      return Response.json(
        await saveNutritionRecurringMealServer(parsed.data.state, parsed.data.draft)
      );
    case 'saveCatalogItem':
      return Response.json(
        await saveNutritionCatalogItemServer(parsed.data.state, parsed.data.draft)
      );
    case 'clearPlannedMeal':
      return Response.json(await clearNutritionPlannedMealServer(parsed.data.state));
    case 'reuseMeal':
      return Response.json(await reuseNutritionMealServer(parsed.data.state, parsed.data.favoriteMealId));
  }
};
