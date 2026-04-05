import { z } from 'zod';
import type {
  NutritionCatalogItemDraft,
  NutritionMealDraft,
  NutritionPageState,
  NutritionPlannedMealDraft,
  NutritionRecurringMealDraft,
} from './controller';

function isNutritionPageState(value: unknown): value is NutritionPageState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const summary = state.summary as Record<string, unknown> | undefined;
  const form = state.form as Record<string, unknown> | undefined;
  const recommendationContext = state.recommendationContext as Record<string, unknown> | undefined;

  return (
    typeof state.loading === 'boolean' &&
    typeof state.localDay === 'string' &&
    typeof state.saveNotice === 'string' &&
    typeof state.searchNotice === 'string' &&
    typeof state.packagedNotice === 'string' &&
    typeof state.recipeNotice === 'string' &&
    summary !== undefined &&
    typeof summary.calories === 'number' &&
    typeof summary.protein === 'number' &&
    typeof summary.fiber === 'number' &&
    typeof summary.carbs === 'number' &&
    typeof summary.fat === 'number' &&
    Array.isArray(summary.entries) &&
    Array.isArray(state.favoriteMeals) &&
    Array.isArray(state.catalogItems) &&
    Array.isArray(state.recipeCatalogItems) &&
    (state.plannedMeal === null ||
      (typeof state.plannedMeal === 'object' && state.plannedMeal !== null)) &&
    typeof state.plannedMealIssue === 'string' &&
    (state.plannedMealSlotId === null || typeof state.plannedMealSlotId === 'string') &&
    typeof state.searchQuery === 'string' &&
    Array.isArray(state.matches) &&
    typeof state.packagedQuery === 'string' &&
    typeof state.barcodeQuery === 'string' &&
    Array.isArray(state.packagedMatches) &&
    typeof state.recipeQuery === 'string' &&
    Array.isArray(state.recipeMatches) &&
    (state.selectedMatch === null ||
      (typeof state.selectedMatch === 'object' && state.selectedMatch !== null)) &&
    form !== undefined &&
    typeof form.mealType === 'string' &&
    typeof form.name === 'string' &&
    typeof form.calories === 'string' &&
    typeof form.protein === 'string' &&
    typeof form.fiber === 'string' &&
    typeof form.carbs === 'string' &&
    typeof form.fat === 'string' &&
    typeof form.notes === 'string' &&
    recommendationContext !== undefined &&
    typeof recommendationContext.anxietyCount === 'number' &&
    typeof recommendationContext.symptomCount === 'number' &&
    (recommendationContext.sleepHours === undefined ||
      typeof recommendationContext.sleepHours === 'number') &&
    (recommendationContext.sleepQuality === undefined ||
      typeof recommendationContext.sleepQuality === 'number')
  );
}

const nutritionPageStateSchema = z.custom<NutritionPageState>(isNutritionPageState, {
  message: 'Invalid nutrition page state',
});

const nutritionMealDraftSchema = z.object({
  localDay: z.string(),
  mealType: z.string(),
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  fiber: z.number(),
  carbs: z.number(),
  fat: z.number(),
  notes: z.string(),
}) satisfies z.ZodType<NutritionMealDraft>;

const nutritionRecurringMealDraftSchema = z.object({
  mealType: z.string(),
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  fiber: z.number(),
  carbs: z.number(),
  fat: z.number(),
  sourceName: z.string().optional(),
}) satisfies z.ZodType<NutritionRecurringMealDraft>;

const nutritionPlannedMealDraftSchema = nutritionRecurringMealDraftSchema.extend({
  notes: z.string(),
  foodCatalogItemId: z.string().optional(),
}) satisfies z.ZodType<NutritionPlannedMealDraft>;

const nutritionCatalogItemDraftSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein: z.number(),
  fiber: z.number(),
  carbs: z.number(),
  fat: z.number(),
}) satisfies z.ZodType<NutritionCatalogItemDraft>;

export const nutritionRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('load'),
    localDay: z.string(),
    state: nutritionPageStateSchema,
  }),
  z.object({
    action: z.literal('saveMeal'),
    state: nutritionPageStateSchema,
    draft: nutritionMealDraftSchema,
  }),
  z.object({
    action: z.literal('planMeal'),
    state: nutritionPageStateSchema,
    draft: nutritionPlannedMealDraftSchema,
  }),
  z.object({
    action: z.literal('saveRecurringMeal'),
    state: nutritionPageStateSchema,
    draft: nutritionRecurringMealDraftSchema,
  }),
  z.object({
    action: z.literal('saveCatalogItem'),
    state: nutritionPageStateSchema,
    draft: nutritionCatalogItemDraftSchema,
  }),
  z.object({
    action: z.literal('clearPlannedMeal'),
    state: nutritionPageStateSchema,
  }),
  z.object({
    action: z.literal('reuseMeal'),
    state: nutritionPageStateSchema,
    favoriteMealId: z.string(),
  }),
]);

export type NutritionRequest = z.infer<typeof nutritionRequestSchema>;

export const nutritionQueryRequestSchema = z.object({
  query: z.string().optional(),
});

export type NutritionQueryRequest = z.infer<typeof nutritionQueryRequestSchema>;

export const nutritionEnrichParamsSchema = z.object({
  fdcId: z.string().trim().regex(/^\d+$/, 'Invalid USDA food id.'),
});
