import type {
  FoodCatalogItem,
  FoodEntry,
  PlannedMeal,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import type { FoodLookupResult } from '$lib/features/nutrition/types';
import type { NutritionRecommendation } from './recommend';

export const nutritionMealTypeOptions = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const;

export interface NutritionFormState {
  mealType: string;
  name: string;
  calories: string;
  protein: string;
  fiber: string;
  carbs: string;
  fat: string;
  notes: string;
}

export interface NutritionDraftShape {
  localDay: string;
  mealType: string;
  name: string;
  calories?: number;
  protein?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
  notes: string;
  foodCatalogItemId?: string;
  recipeCatalogItemId?: string;
  sourceName?: string;
}

function parseOptionalNutritionMetric(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

export interface NutritionDraftSource {
  kind: 'food' | 'recipe';
  id: string;
  sourceName?: string;
}

type NutritionMetrics = {
  calories?: number;
  protein?: number;
  fiber?: number;
  carbs?: number;
  fat?: number;
};

export function createNutritionForm(): NutritionFormState {
  return {
    mealType: 'breakfast',
    name: '',
    calories: '',
    protein: '',
    fiber: '',
    carbs: '',
    fat: '',
    notes: '',
  };
}

export function createNutritionDraftFromForm(
  localDay: string,
  form: NutritionFormState,
  selectedMatch: FoodLookupResult | null,
  selectedDraftSource: NutritionDraftSource | null
): NutritionDraftShape {
  return {
    localDay,
    mealType: form.mealType,
    name: form.name,
    calories: parseOptionalNutritionMetric(form.calories),
    protein: parseOptionalNutritionMetric(form.protein),
    fiber: parseOptionalNutritionMetric(form.fiber),
    carbs: parseOptionalNutritionMetric(form.carbs),
    fat: parseOptionalNutritionMetric(form.fat),
    notes: form.notes,
    foodCatalogItemId:
      selectedDraftSource?.kind === 'food' ? selectedDraftSource.id : selectedMatch?.id,
    recipeCatalogItemId:
      selectedDraftSource?.kind === 'recipe' ? selectedDraftSource.id : undefined,
    sourceName: selectedDraftSource?.sourceName ?? selectedMatch?.sourceName,
  };
}

export function mergeNutritionFormWithDraft(
  form: NutritionFormState,
  draft: {
    name?: string;
    calories?: number;
    protein?: number;
    fiber?: number;
    carbs?: number;
    fat?: number;
  }
): NutritionFormState {
  return {
    ...form,
    name: draft.name ?? form.name,
    calories: draft.calories === undefined ? '' : String(draft.calories),
    protein: draft.protein === undefined ? '' : String(draft.protein),
    fiber: draft.fiber === undefined ? '' : String(draft.fiber),
    carbs: draft.carbs === undefined ? '' : String(draft.carbs),
    fat: draft.fat === undefined ? '' : String(draft.fat),
  };
}

export function createNutritionMetricRows(metrics: NutritionMetrics): string[] {
  const primary = [
    metrics.calories !== undefined ? `${metrics.calories} kcal` : null,
    metrics.protein !== undefined ? `${metrics.protein}g protein` : null,
    metrics.fiber !== undefined ? `${metrics.fiber}g fiber` : null,
  ].filter((value): value is string => value !== null);

  const secondary = [
    metrics.carbs !== undefined ? `${metrics.carbs}g carbs` : null,
    metrics.fat !== undefined ? `${metrics.fat}g fat` : null,
  ].filter((value): value is string => value !== null);

  return [primary.join(' · '), secondary.join(' · ')].filter((row) => row.length > 0);
}

export function createNutritionSummaryRows(summary: {
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  entries: FoodEntry[];
}): string[] {
  const hasUnknownMetric = (key: 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat'): boolean =>
    summary.entries.some((entry) => entry[key] === undefined);

  return [
    `Calories: ${hasUnknownMetric('calories') ? 'unknown' : summary.calories}`,
    `Protein: ${hasUnknownMetric('protein') ? 'unknown' : summary.protein}`,
    `Fiber: ${hasUnknownMetric('fiber') ? 'unknown' : summary.fiber}`,
    `Carbs: ${hasUnknownMetric('carbs') ? 'unknown' : summary.carbs}`,
    `Fat: ${hasUnknownMetric('fat') ? 'unknown' : summary.fat}`,
  ];
}

export function createPlannedMealRows(plannedMeal: PlannedMeal | null): string[] {
  if (!plannedMeal) {
    return [];
  }

  return [
    `Meal type: ${plannedMeal.mealType}`,
    ...(plannedMeal.calories !== undefined ? [`Calories: ${plannedMeal.calories}`] : []),
    ...(plannedMeal.protein !== undefined ? [`Protein: ${plannedMeal.protein}`] : []),
    ...(plannedMeal.fiber !== undefined ? [`Fiber: ${plannedMeal.fiber}`] : []),
    ...(plannedMeal.carbs !== undefined ? [`Carbs: ${plannedMeal.carbs}`] : []),
    ...(plannedMeal.fat !== undefined ? [`Fat: ${plannedMeal.fat}`] : []),
  ];
}

export function createFoodCatalogItemRows(item: FoodCatalogItem): string[] {
  return createNutritionMetricRows(item);
}

export function createRecipeSummary(recipe: RecipeCatalogItem): string {
  return [recipe.mealType, recipe.cuisine].filter(Boolean).join(' · ') || recipe.sourceName;
}

export function createRecommendationSummary(recommendation: NutritionRecommendation): string {
  return `${recommendation.kind === 'food' ? 'Food' : 'Recipe'} · score ${recommendation.score}`;
}

export function createRecommendationContextRows(context: {
  mealType: string;
  sleepHours?: number;
  sleepQuality?: number;
  anxietyCount: number;
  symptomCount: number;
}): string[] {
  return [
    `Meal target: ${context.mealType}`,
    context.sleepHours !== undefined ? `Sleep: ${context.sleepHours} hours` : 'Sleep: not logged',
    context.sleepQuality !== undefined
      ? `Sleep quality: ${context.sleepQuality}/5`
      : 'Sleep quality: not logged',
    `Anxiety episodes today: ${context.anxietyCount}`,
    `Symptoms today: ${context.symptomCount}`,
  ];
}
