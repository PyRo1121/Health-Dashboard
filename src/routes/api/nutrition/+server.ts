import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadNutritionPage,
  planNutritionMeal,
  reuseNutritionMeal,
  clearNutritionPlannedMeal,
  saveNutritionCatalogItem,
  saveNutritionMeal,
  saveNutritionRecurringMeal,
  type NutritionPageState,
} from '$lib/features/nutrition/controller';
import { nutritionRequestSchema, type NutritionRequest } from '$lib/features/nutrition/contracts';

export const POST = createDbActionPostHandler<NutritionRequest, NutritionPageState>(
  {
    load: (db, body) => loadNutritionPage(db, body.localDay, body.state),
    saveMeal: (db, body) => saveNutritionMeal(db, body.state, body.draft),
    planMeal: (db, body) => planNutritionMeal(db, body.state, body.draft),
    saveRecurringMeal: (db, body) => saveNutritionRecurringMeal(db, body.state, body.draft),
    saveCatalogItem: (db, body) => saveNutritionCatalogItem(db, body.state, body.draft),
    clearPlannedMeal: (db, body) => clearNutritionPlannedMeal(db, body.state),
    reuseMeal: (db, body) => reuseNutritionMeal(db, body.state, body.favoriteMealId),
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = nutritionRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid nutrition request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid nutrition request payload.', { status: 400 }),
  }
);
