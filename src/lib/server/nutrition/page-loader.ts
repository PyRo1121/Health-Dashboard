import type {
  DailyRecord,
  FavoriteMeal,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import { createNutritionPageState, type NutritionPageState } from '$lib/features/nutrition/state';
import {
  buildNutritionRecommendationContextFromData,
  buildDailyNutritionSummaryFromEntries,
} from '$lib/features/nutrition/summary';
import { resolveNutritionPlannedMeal } from '$lib/features/nutrition/planned-meal-resolution';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import {
  listFoodCatalogItemsServer,
  listPlanSlotsForDayServer,
  listRecipeCatalogItemsServer,
} from '$lib/server/planning/store';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectAllMirrorRecords, selectMirrorRecordsByField } from '$lib/server/db/drizzle/mirror';

async function listFavoriteMealsServer(): Promise<FavoriteMeal[]> {
  const { db } = getServerDrizzleClient();
  return (await selectAllMirrorRecords<FavoriteMeal>(db, drizzleSchema.favoriteMeals)).sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt)
  );
}

function createLoadedNutritionPageState(
  state: NutritionPageState,
  localDay: string,
  data: {
    summary: {
      calories: number;
      protein: number;
      fiber: number;
      carbs: number;
      fat: number;
      entries: FoodEntry[];
    };
    favoriteMeals: FavoriteMeal[];
    catalogItems: FoodCatalogItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    plannedMeal: ReturnType<typeof resolveNutritionPlannedMeal>;
    recommendationContext: {
      sleepHours?: number;
      sleepQuality?: number;
      anxietyCount: number;
      symptomCount: number;
    };
  }
): NutritionPageState {
  return {
    ...state,
    loading: false,
    localDay,
    saveNotice: state.saveNotice,
    summary: data.summary,
    favoriteMeals: data.favoriteMeals,
    catalogItems: data.catalogItems,
    recipeCatalogItems: data.recipeCatalogItems,
    plannedMeal: data.plannedMeal.candidate?.meal ?? null,
    plannedMealIssue: data.plannedMeal.issue ?? '',
    plannedMealSlotId: data.plannedMeal.candidate?.slotId ?? null,
    plannedMealSource: data.plannedMeal.candidate?.source ?? null,
    recommendationContext: data.recommendationContext,
  };
}

export async function loadNutritionPageServer(
  localDay: string,
  state: NutritionPageState = createNutritionPageState()
): Promise<NutritionPageState> {
  const { db } = getServerDrizzleClient();
  const [
    dailyRecords,
    healthEvents,
    foodEntries,
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    planSlots,
  ] = await Promise.all([
    selectMirrorRecordsByField<DailyRecord>(db, drizzleSchema.dailyRecords, 'date', localDay),
    selectMirrorRecordsByField<HealthEvent>(db, drizzleSchema.healthEvents, 'localDay', localDay),
    selectMirrorRecordsByField<FoodEntry>(db, drizzleSchema.foodEntries, 'localDay', localDay),
    listFavoriteMealsServer(),
    listFoodCatalogItemsServer(),
    listRecipeCatalogItemsServer(),
    listPlanSlotsForDayServer(localDay),
  ]);

  return createLoadedNutritionPageState(state, localDay, {
    summary: buildDailyNutritionSummaryFromEntries(foodEntries),
    favoriteMeals,
    catalogItems,
    recipeCatalogItems,
    plannedMeal: resolveNutritionPlannedMeal(planSlots, catalogItems, recipeCatalogItems),
    recommendationContext: buildNutritionRecommendationContextFromData(
      dailyRecords[0] ?? null,
      healthEvents
    ),
  });
}

export async function reloadNutritionPageStateServer(
  state: NutritionPageState,
  overrides: Partial<NutritionPageState> = {}
): Promise<NutritionPageState> {
  return {
    ...(await loadNutritionPageServer(state.localDay, state)),
    ...overrides,
  };
}

export async function refreshNutritionPageAfterMutationServer(
  state: NutritionPageState,
  overrides: Partial<NutritionPageState> = {},
  reviewLocalDay?: string
): Promise<NutritionPageState> {
  if (reviewLocalDay) {
    await refreshWeeklyReviewArtifactsServer(reviewLocalDay);
  }

  return await reloadNutritionPageStateServer(state, overrides);
}
