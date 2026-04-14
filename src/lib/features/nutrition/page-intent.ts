import type { RecipeCatalogItem } from '$lib/core/domain/types';
import type { FoodLookupResult } from './types';
import { clearNutritionIntentFromLocation, readNutritionIntentFromSearch } from './navigation';
import { foodLookupResultFromCatalogItem } from './lookup';
import type { NutritionPageState } from './state';

interface NutritionIntentWindow {
  location: Pick<Location, 'search' | 'pathname' | 'hash'>;
  history: Pick<History, 'replaceState' | 'state'>;
}

interface NutritionIntentDependencies {
  hydrateFoodMatch: (
    state: NutritionPageState,
    match: FoodLookupResult
  ) => Promise<NutritionPageState>;
  applyRecipe: (state: NutritionPageState, recipe: RecipeCatalogItem) => NutritionPageState;
}

export async function applyPendingNutritionIntent(
  state: NutritionPageState,
  intentWindow: NutritionIntentWindow,
  dependencies: NutritionIntentDependencies
): Promise<NutritionPageState> {
  const intent = readNutritionIntentFromSearch(intentWindow.location.search);
  if (!intent) {
    return state;
  }

  clearNutritionIntentFromLocation(intentWindow.location, intentWindow.history);

  if (intent.kind === 'food') {
    const item = state.catalogItems.find((candidate) => candidate.id === intent.id);
    if (!item) {
      return {
        ...state,
        searchNotice: 'That saved food is no longer available in your local catalog.',
      };
    }

    const hydrated = await dependencies.hydrateFoodMatch(
      state,
      foodLookupResultFromCatalogItem(item)
    );
    return {
      ...hydrated,
      searchNotice: 'Loaded from Review strategy.',
    };
  }

  const recipe = state.recipeCatalogItems.find((candidate) => candidate.id === intent.id);
  if (!recipe) {
    return {
      ...state,
      recipeNotice: 'That saved recipe is no longer available in your local cache.',
    };
  }

  return {
    ...dependencies.applyRecipe(state, recipe),
    recipeNotice: 'Loaded from Review strategy.',
  };
}
