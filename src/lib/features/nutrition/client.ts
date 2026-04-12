import { currentLocalDay } from '$lib/core/domain/time';
import {
  createFeatureActionClient,
  createFeatureRequestClient,
} from '$lib/core/http/feature-client';
import {
  clearNutritionPlannedMeal as clearNutritionPlannedMealController,
  planNutritionMeal as planNutritionMealController,
  reuseNutritionMeal as reuseNutritionMealController,
  saveNutritionCatalogItem as saveNutritionCatalogItemController,
  saveNutritionMeal as saveNutritionMealController,
  saveNutritionRecurringMeal as saveNutritionRecurringMealController,
  type NutritionActionsStorage,
} from './actions';
import {
  applyNutritionBarcodeMatch,
  applyNutritionRecipeMatches,
  applyNutritionSearchMatches,
  applyPackagedNutritionMatches,
  createNutritionPageState,
  loadNutritionPage as loadNutritionPageController,
  selectNutritionMatch,
  updateNutritionBarcode,
  updateNutritionPackagedSearch,
  updateNutritionRecipeSearch,
  updateNutritionSearch,
  useNutritionRecipe,
  type NutritionPageState,
} from './state';
import type {
  NutritionCatalogItemDraft,
  NutritionMealDraft,
  NutritionPlannedMealDraft,
  NutritionRecurringMealDraft,
} from './actions';
import { findFoodCatalogItemByBarcode, searchFoodData, searchPackagedFoodCatalog } from './lookup';
import type { FoodLookupResult } from './types';
import { listFoodCatalogItems, listRecipeCatalogItems } from './store';
import type { RecipeCatalogItem } from '$lib/core/domain/types';

export {
  createNutritionPageState,
  updateNutritionBarcode,
  updateNutritionPackagedSearch,
  updateNutritionRecipeSearch,
  updateNutritionSearch,
};

const nutritionClient = createFeatureActionClient<NutritionActionsStorage>('/api/nutrition');
const packagedSearchClient = createFeatureRequestClient<
  Parameters<typeof loadNutritionPageController>[0]
>('/api/nutrition/search-packaged');
const usdaSearchClient = createFeatureRequestClient<
  Parameters<typeof loadNutritionPageController>[0]
>('/api/nutrition/search-usda');
const recipeSearchClient = createFeatureRequestClient<
  Parameters<typeof loadNutritionPageController>[0]
>('/api/nutrition/search-recipes');

function createNutritionLookupClient(endpoint: string) {
  return createFeatureRequestClient<Parameters<typeof loadNutritionPageController>[0]>(endpoint);
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
