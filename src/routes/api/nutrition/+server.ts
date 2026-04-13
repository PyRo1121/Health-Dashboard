import type { RequestHandler } from './$types';
import { nutritionRequestSchema } from '$lib/features/nutrition/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  clearNutritionPlannedMealServer,
  loadNutritionPageServer,
  planNutritionMealServer,
  reuseNutritionMealServer,
  saveNutritionCatalogItemServer,
  saveNutritionMealServer,
  saveNutritionRecurringMealServer,
} from '$lib/server/nutrition/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: nutritionRequestSchema,
  invalidMessage: 'Invalid nutrition request payload.',
  handlers: {
    load: async (data) => await loadNutritionPageServer(data.localDay, data.state),
    saveMeal: async (data) => await saveNutritionMealServer(data.state, data.draft),
    planMeal: async (data) => await planNutritionMealServer(data.state, data.draft),
    saveRecurringMeal: async (data) =>
      await saveNutritionRecurringMealServer(data.state, data.draft),
    saveCatalogItem: async (data) => await saveNutritionCatalogItemServer(data.state, data.draft),
    clearPlannedMeal: async (data) => await clearNutritionPlannedMealServer(data.state),
    reuseMeal: async (data) => await reuseNutritionMealServer(data.state, data.favoriteMealId),
  },
});
