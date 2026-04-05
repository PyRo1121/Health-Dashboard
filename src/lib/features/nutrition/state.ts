import type { HealthDatabase } from '$lib/core/db/types';
import type {
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  PlannedMeal,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import { createNutritionForm, mergeNutritionFormWithDraft, type NutritionFormState } from './model';
import { getNutritionPlannedMealResolution } from './planned-meal-resolution';
import {
  attachNutrientsToFoodEntry,
  buildNutritionRecommendationContext,
  buildDailyNutritionSummary,
  listFoodCatalogItems,
  listFavoriteMeals,
  listRecipeCatalogItems,
  searchFoodData,
  type FoodLookupResult,
} from './service';

type NutritionSummary = {
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  entries: FoodEntry[];
};

type NutritionRecommendationContext = {
  sleepHours?: number;
  sleepQuality?: number;
  anxietyCount: number;
  symptomCount: number;
};

export interface NutritionPageState {
  loading: boolean;
  localDay: string;
  saveNotice: string;
  searchNotice: string;
  packagedNotice: string;
  recipeNotice: string;
  summary: NutritionSummary;
  favoriteMeals: FavoriteMeal[];
  catalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  plannedMeal: PlannedMeal | null;
  plannedMealCompatibilityNotice: string;
  plannedMealIssue: string;
  plannedMealSlotId: string | null;
  searchQuery: string;
  matches: FoodLookupResult[];
  packagedQuery: string;
  barcodeQuery: string;
  packagedMatches: FoodLookupResult[];
  recipeQuery: string;
  recipeMatches: RecipeCatalogItem[];
  selectedMatch: FoodLookupResult | null;
  form: NutritionFormState;
  recommendationContext: NutritionRecommendationContext;
}

function createEmptyNutritionSummary(): NutritionSummary {
  return {
    calories: 0,
    protein: 0,
    fiber: 0,
    carbs: 0,
    fat: 0,
    entries: [],
  };
}

function createEmptyRecommendationContext(): NutritionRecommendationContext {
  return {
    anxietyCount: 0,
    symptomCount: 0,
  };
}

function clearSearchNotices(): Pick<NutritionPageState, 'searchNotice' | 'packagedNotice'> {
  return {
    searchNotice: '',
    packagedNotice: '',
  };
}

export function createNutritionPageState(): NutritionPageState {
  return {
    loading: true,
    localDay: '',
    saveNotice: '',
    searchNotice: '',
    packagedNotice: '',
    recipeNotice: '',
    summary: createEmptyNutritionSummary(),
    favoriteMeals: [],
    catalogItems: [],
    recipeCatalogItems: [],
    plannedMeal: null,
    plannedMealCompatibilityNotice: '',
    plannedMealIssue: '',
    plannedMealSlotId: null,
    searchQuery: '',
    matches: [],
    packagedQuery: '',
    barcodeQuery: '',
    packagedMatches: [],
    recipeQuery: '',
    recipeMatches: [],
    selectedMatch: null,
    form: createNutritionForm(),
    recommendationContext: createEmptyRecommendationContext(),
  };
}

export async function loadNutritionPage(
  db: HealthDatabase,
  localDay: string,
  state: NutritionPageState
): Promise<NutritionPageState> {
  const [
    summary,
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    plannedMeal,
    recommendationContext,
  ] = await Promise.all([
    buildDailyNutritionSummary(db, localDay),
    listFavoriteMeals(db),
    listFoodCatalogItems(db),
    listRecipeCatalogItems(db),
    getNutritionPlannedMealResolution(db, localDay),
    buildNutritionRecommendationContext(db, localDay),
  ]);

  return {
    ...state,
    loading: false,
    localDay,
    summary,
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    plannedMeal: plannedMeal.candidate?.meal ?? null,
    plannedMealCompatibilityNotice: plannedMeal.compatibilityNotice ?? '',
    plannedMealIssue: plannedMeal.issue ?? '',
    plannedMealSlotId:
      plannedMeal.candidate?.kind === 'plan-slot-food'
        ? (plannedMeal.candidate.slotId ?? null)
        : null,
    recommendationContext,
  };
}

export async function reloadNutritionPageState(
  db: HealthDatabase,
  state: NutritionPageState,
  overrides: Partial<NutritionPageState> = {}
): Promise<NutritionPageState> {
  const next = await loadNutritionPage(db, state.localDay, state);
  return {
    ...next,
    ...overrides,
  };
}

export function updateNutritionSearch(
  state: NutritionPageState,
  searchQuery: string
): NutritionPageState {
  return {
    ...state,
    searchQuery,
    ...clearSearchNotices(),
  };
}

export function updateNutritionRecipeSearch(
  state: NutritionPageState,
  recipeQuery: string
): NutritionPageState {
  return {
    ...state,
    recipeQuery,
    recipeNotice: '',
  };
}

export function updateNutritionPackagedSearch(
  state: NutritionPageState,
  packagedQuery: string
): NutritionPageState {
  return {
    ...state,
    packagedQuery,
    packagedNotice: '',
  };
}

export function updateNutritionBarcode(
  state: NutritionPageState,
  barcodeQuery: string
): NutritionPageState {
  return {
    ...state,
    barcodeQuery,
    packagedNotice: '',
  };
}

export function runNutritionSearch(state: NutritionPageState): NutritionPageState {
  return {
    ...state,
    matches: searchFoodData(state.searchQuery, state.catalogItems),
    ...clearSearchNotices(),
  };
}

export function applyNutritionSearchMatches(
  state: NutritionPageState,
  matches: FoodLookupResult[],
  searchNotice = ''
): NutritionPageState {
  return {
    ...state,
    matches,
    searchNotice,
  };
}

export function applyPackagedNutritionMatches(
  state: NutritionPageState,
  packagedMatches: FoodLookupResult[],
  packagedNotice = ''
): NutritionPageState {
  return {
    ...state,
    packagedMatches,
    packagedNotice,
  };
}

export function applyNutritionRecipeMatches(
  state: NutritionPageState,
  recipeMatches: RecipeCatalogItem[],
  recipeNotice = ''
): NutritionPageState {
  return {
    ...state,
    recipeMatches,
    recipeNotice,
  };
}

export function applyNutritionBarcodeMatch(
  state: NutritionPageState,
  match: FoodLookupResult | null
): NutritionPageState {
  if (!match) {
    return {
      ...state,
      packagedMatches: [],
      packagedNotice: 'No packaged food found for that barcode.',
    };
  }

  return {
    ...selectNutritionMatch(
      {
        ...state,
        packagedMatches: [match],
      },
      match
    ),
    packagedNotice: 'Packaged food loaded from barcode.',
  };
}

export function selectNutritionMatch(
  state: NutritionPageState,
  match: FoodLookupResult
): NutritionPageState {
  return {
    ...state,
    selectedMatch: match,
    searchNotice: '',
    form: mergeNutritionFormWithDraft(
      state.form,
      attachNutrientsToFoodEntry(
        {
          localDay: state.localDay,
          mealType: state.form.mealType,
          name: state.form.name,
        },
        match
      )
    ),
  };
}

export function useNutritionRecipe(
  state: NutritionPageState,
  recipe: RecipeCatalogItem
): NutritionPageState {
  return {
    ...state,
    recipeNotice: `Loaded ${recipe.title} into the meal form.`,
    form: {
      ...state.form,
      name: recipe.title,
      notes: recipe.ingredients.slice(0, 4).join(', '),
    },
  };
}
