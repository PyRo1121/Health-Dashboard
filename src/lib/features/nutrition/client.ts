import { currentLocalDay } from '$lib/core/domain/time';
import {
  createFeatureActionClient,
  createFeatureRequestClient,
} from '$lib/core/http/feature-client';
import {
  applyNutritionBarcodeMatch,
  applyNutritionRecipeMatches,
  applyNutritionSearchMatches,
  applyPackagedNutritionMatches,
  clearNutritionPlannedMeal as clearNutritionPlannedMealController,
  createNutritionPageState,
  loadNutritionPage as loadNutritionPageController,
  planNutritionMeal as planNutritionMealController,
  reuseNutritionMeal as reuseNutritionMealController,
  updateNutritionBarcode,
  updateNutritionPackagedSearch,
  updateNutritionRecipeSearch,
  saveNutritionCatalogItem as saveNutritionCatalogItemController,
  saveNutritionMeal as saveNutritionMealController,
  saveNutritionRecurringMeal as saveNutritionRecurringMealController,
  selectNutritionMatch,
  useNutritionRecipe,
  updateNutritionSearch,
  type NutritionCatalogItemDraft,
  type NutritionMealDraft,
  type NutritionPageState,
  type NutritionPlannedMealDraft,
  type NutritionRecurringMealDraft,
} from './controller';
import {
  findFoodCatalogItemByBarcode,
  listFoodCatalogItems,
  listRecipeCatalogItems,
  searchFoodData,
  searchPackagedFoodCatalog,
  type FoodLookupResult,
} from './service';
import type { RecipeCatalogItem } from '$lib/core/domain/types';

export {
  createNutritionPageState,
  updateNutritionBarcode,
  updateNutritionPackagedSearch,
  updateNutritionRecipeSearch,
  updateNutritionSearch,
};

const nutritionClient = createFeatureActionClient('/api/nutrition');
const packagedSearchClient = createFeatureRequestClient('/api/nutrition/search-packaged');
const usdaSearchClient = createFeatureRequestClient('/api/nutrition/search-usda');
const recipeSearchClient = createFeatureRequestClient('/api/nutrition/search-recipes');

function createNutritionLookupClient(endpoint: string) {
  return createFeatureRequestClient(endpoint);
}

export async function loadNutritionPage(
  state: NutritionPageState,
  localDay = currentLocalDay()
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction(
    'load',
    state,
    (db) => loadNutritionPageController(db, localDay, state),
    { localDay }
  );
}

export async function saveNutritionMeal(
  state: NutritionPageState,
  draft: NutritionMealDraft
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction(
    'saveMeal',
    state,
    (db) => saveNutritionMealController(db, state, draft),
    { draft }
  );
}

export async function saveNutritionRecurringMeal(
  state: NutritionPageState,
  draft: NutritionRecurringMealDraft
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction(
    'saveRecurringMeal',
    state,
    (db) => saveNutritionRecurringMealController(db, state, draft),
    { draft }
  );
}

export async function saveNutritionCatalogItem(
  state: NutritionPageState,
  draft: NutritionCatalogItemDraft
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction(
    'saveCatalogItem',
    state,
    (db) => saveNutritionCatalogItemController(db, state, draft),
    { draft }
  );
}

export async function planNutritionMeal(
  state: NutritionPageState,
  draft: NutritionPlannedMealDraft
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction(
    'planMeal',
    state,
    (db) => planNutritionMealController(db, state, draft),
    { draft }
  );
}

export async function clearNutritionPlannedMeal(
  state: NutritionPageState
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction('clearPlannedMeal', state, (db) =>
    clearNutritionPlannedMealController(db, state)
  );
}

export async function searchPackagedFoods(state: NutritionPageState): Promise<NutritionPageState> {
  const packagedMatches = await packagedSearchClient.request(
    {
      query: state.packagedQuery,
    },
    async (db) => searchPackagedFoodCatalog(state.packagedQuery, await listFoodCatalogItems(db))
  );

  return applyPackagedNutritionMatches(
    state,
    packagedMatches,
    packagedMatches.length ? '' : 'No packaged food matches found.'
  );
}

export async function searchNutritionFoods(state: NutritionPageState): Promise<NutritionPageState> {
  const response = await usdaSearchClient.request<{ matches: FoodLookupResult[]; notice?: string }>(
    {
      query: state.searchQuery,
    },
    async (db) => ({
      matches: searchFoodData(state.searchQuery, await listFoodCatalogItems(db)),
    })
  );

  return applyNutritionSearchMatches(state, response.matches, response.notice ?? '');
}

export async function useNutritionMatch(
  state: NutritionPageState,
  match: FoodLookupResult
): Promise<NutritionPageState> {
  if (match.isEnriched !== false || !match.externalId) {
    return selectNutritionMatch(state, match);
  }

  const enriched = await createNutritionLookupClient(
    `/api/nutrition/enrich/${encodeURIComponent(match.externalId)}`
  ).request<FoodLookupResult>({}, async () => match);

  return {
    ...selectNutritionMatch(state, enriched),
    searchNotice: 'USDA result enriched and cached locally.',
  };
}

export async function lookupPackagedBarcode(
  state: NutritionPageState
): Promise<NutritionPageState> {
  const match = await createNutritionLookupClient(
    `/api/nutrition/barcode/${encodeURIComponent(state.barcodeQuery)}`
  ).request<FoodLookupResult | null>({}, async (db) =>
    findFoodCatalogItemByBarcode(state.barcodeQuery, await listFoodCatalogItems(db))
  );

  return applyNutritionBarcodeMatch(state, match);
}

export async function searchNutritionRecipes(
  state: NutritionPageState
): Promise<NutritionPageState> {
  const recipeMatches = await recipeSearchClient.request(
    {
      query: state.recipeQuery,
    },
    (db) => listRecipeCatalogItems(db)
  );

  return applyNutritionRecipeMatches(
    state,
    recipeMatches,
    recipeMatches.length ? '' : 'No recipe ideas found.'
  );
}

export function useNutritionRecipeIdea(
  state: NutritionPageState,
  recipe: RecipeCatalogItem
): NutritionPageState {
  return useNutritionRecipe(state, recipe);
}

export async function reuseNutritionMeal(
  state: NutritionPageState,
  favoriteMealId: string
): Promise<NutritionPageState> {
  return await nutritionClient.stateAction(
    'reuseMeal',
    state,
    (db) => reuseNutritionMealController(db, state, favoriteMealId),
    { favoriteMealId }
  );
}
