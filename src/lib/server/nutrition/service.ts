import type { NutritionCatalogItemDraft } from '$lib/features/nutrition/actions';
import type { NutritionPageState } from '$lib/features/nutrition/state';
import { upsertFoodCatalogItemServer } from '$lib/server/nutrition/catalog-store';
import { refreshNutritionPageAfterMutationServer } from '$lib/server/nutrition/page-loader';
export {
  clearNutritionPlannedMealServer,
  planNutritionMealServer,
  reuseNutritionMealServer,
  saveNutritionMealServer,
  saveNutritionRecurringMealServer,
} from '$lib/server/nutrition/meal-mutations';
export {
  enrichNutritionFoodServer,
  lookupNutritionBarcodeServer,
  searchPackagedFoodsServer,
  searchRecipesServer,
  searchUsdaFoodsServer,
  type SearchUsdaResponse,
} from '$lib/server/nutrition/search-service';

export { loadNutritionPageServer } from '$lib/server/nutrition/page-loader';

export async function saveNutritionCatalogItemServer(
  state: NutritionPageState,
  draft: NutritionCatalogItemDraft
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
