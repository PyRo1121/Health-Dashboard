import type { RecipeCatalogItem } from '$lib/core/domain/types';
import { foodLookupResultFromCatalogItem } from '$lib/features/nutrition/lookup';
import type { NutritionPageState } from '$lib/features/nutrition/state';
import type { FoodLookupResult } from '$lib/features/nutrition/types';

const SELECTED_MATCH_INVALIDATION_FIELDS = new Set<keyof NutritionPageState['form']>([
  'name',
  'calories',
  'protein',
  'fiber',
  'carbs',
  'fat',
]);

export interface NutritionActionDraft {
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  notes: string;
  foodCatalogItemId?: string;
  recipeCatalogItemId?: string;
  sourceName?: string;
}

function formatDraftMetric(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function loadPlannedMealIntoDraft(state: NutritionPageState): NutritionPageState {
  if (!state.plannedMeal) {
    return state;
  }

  return {
    ...state,
    selectedMatch: null,
    selectedDraftSource: state.plannedMealSource,
    saveNotice: 'Planned meal loaded into draft.',
    form: {
      ...state.form,
      mealType: state.plannedMeal.mealType,
      name: state.plannedMeal.name,
      calories: formatDraftMetric(state.plannedMeal.calories),
      protein: formatDraftMetric(state.plannedMeal.protein),
      fiber: formatDraftMetric(state.plannedMeal.fiber),
      carbs: formatDraftMetric(state.plannedMeal.carbs),
      fat: formatDraftMetric(state.plannedMeal.fat),
      notes: state.plannedMeal.notes ?? '',
    },
  };
}

export function updateNutritionFormField(
  state: NutritionPageState,
  field: keyof NutritionPageState['form'],
  value: string
): NutritionPageState {
  const shouldClearSelectedMatch =
    SELECTED_MATCH_INVALIDATION_FIELDS.has(field) && state.form[field] !== value;

  return {
    ...state,
    selectedMatch: shouldClearSelectedMatch ? null : state.selectedMatch,
    selectedDraftSource: shouldClearSelectedMatch ? null : state.selectedDraftSource,
    form: {
      ...state.form,
      [field]: value,
    },
  };
}

export function getNutritionRecommendationPlanDraft(
  state: NutritionPageState,
  recommendationId: string,
  kind: 'food' | 'recipe'
): NutritionActionDraft | null {
  if (kind === 'food') {
    const item = state.catalogItems.find((candidate) => candidate.id === recommendationId);
    if (!item) {
      return null;
    }

    return {
      name: item.name,
      mealType: state.form.mealType,
      calories: item.calories ?? 0,
      protein: item.protein ?? 0,
      fiber: item.fiber ?? 0,
      carbs: item.carbs ?? 0,
      fat: item.fat ?? 0,
      notes: '',
      foodCatalogItemId: item.id,
      sourceName: item.sourceName,
    };
  }

  const recipe = state.recipeCatalogItems.find((candidate) => candidate.id === recommendationId);
  if (!recipe) {
    return null;
  }

  return {
    name: recipe.title,
    mealType: recipe.mealType ?? state.form.mealType,
    calories: 0,
    protein: 0,
    fiber: 0,
    carbs: 0,
    fat: 0,
    notes: recipe.ingredients.slice(0, 4).join(', '),
    recipeCatalogItemId: recipe.id,
    sourceName: recipe.sourceName,
  };
}

export async function applyNutritionRecommendationSelection(
  state: NutritionPageState,
  recommendationId: string,
  kind: 'food' | 'recipe',
  hydrateFoodMatch: (
    state: NutritionPageState,
    match: FoodLookupResult
  ) => Promise<NutritionPageState>,
  applyRecipe: (state: NutritionPageState, recipe: RecipeCatalogItem) => NutritionPageState
): Promise<NutritionPageState> {
  if (kind === 'food') {
    const item = state.catalogItems.find((candidate) => candidate.id === recommendationId);
    if (!item) {
      return state;
    }

    return await hydrateFoodMatch(state, foodLookupResultFromCatalogItem(item));
  }

  const recipe = state.recipeCatalogItems.find((candidate) => candidate.id === recommendationId);
  if (!recipe) {
    return state;
  }

  return applyRecipe(state, recipe);
}
