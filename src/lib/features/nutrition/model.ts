import type { FoodEntry, PlannedMeal, RecipeCatalogItem } from '$lib/core/domain/types';
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

export interface NutritionDraftSource {
  kind: 'food' | 'recipe';
  id: string;
  sourceName?: string;
}

export function createNutritionForm(): NutritionFormState {
  return {
    mealType: 'breakfast',
    name: '',
    calories: '0',
    protein: '0',
    fiber: '0',
    carbs: '0',
    fat: '0',
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
    calories: Number(form.calories),
    protein: Number(form.protein),
    fiber: Number(form.fiber),
    carbs: Number(form.carbs),
    fat: Number(form.fat),
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
    calories: String(draft.calories ?? 0),
    protein: String(draft.protein ?? 0),
    fiber: String(draft.fiber ?? 0),
    carbs: String(draft.carbs ?? 0),
    fat: String(draft.fat ?? 0),
  };
}

export function createNutritionSummaryRows(summary: {
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  entries: FoodEntry[];
}): string[] {
  return [
    `Calories: ${summary.calories}`,
    `Protein: ${summary.protein}`,
    `Fiber: ${summary.fiber}`,
    `Carbs: ${summary.carbs}`,
    `Fat: ${summary.fat}`,
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
