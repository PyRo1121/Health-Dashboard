import type { FavoriteMeal } from '$lib/core/domain/types';
import { resolveNutritionPlannedMeal } from '$lib/features/nutrition/planned-meal-resolution';
import type { NutritionPageState } from '$lib/features/nutrition/state';
import {
  createFoodEntryServer,
  resolveNutritionPlannedFoodIdServer,
  saveFavoriteMealServer,
} from '$lib/server/nutrition/catalog-store';
import { refreshNutritionPageAfterMutationServer } from '$lib/server/nutrition/page-loader';
import {
  deletePlanSlotServer,
  ensureWeeklyPlanServer,
  listFoodCatalogItemsServer,
  listPlanSlotsForDayServer,
  savePlanSlotServer,
} from '$lib/server/planning/store';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordById } from '$lib/server/db/drizzle/mirror';

export async function saveNutritionMealServer(
  state: NutritionPageState,
  draft: {
    localDay: string;
    mealType: string;
    name: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    notes: string;
    sourceName?: string;
  }
): Promise<NutritionPageState> {
  await createFoodEntryServer(draft);
  return await refreshNutritionPageAfterMutationServer(
    state,
    { saveNotice: 'Meal saved.' },
    draft.localDay
  );
}

export async function saveNutritionRecurringMealServer(
  state: NutritionPageState,
  draft: {
    mealType: string;
    name: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    sourceName?: string;
  }
): Promise<NutritionPageState> {
  await saveFavoriteMealServer({
    name: draft.name || 'Quick oatmeal',
    mealType: draft.mealType,
    items: [
      {
        name: draft.name || 'Untitled meal',
        calories: draft.calories,
        protein: draft.protein,
        fiber: draft.fiber,
        carbs: draft.carbs,
        fat: draft.fat,
        sourceName: draft.sourceName,
      },
    ],
  });

  return await refreshNutritionPageAfterMutationServer(state, {
    saveNotice: 'Recurring meal saved.',
  });
}

export async function planNutritionMealServer(
  state: NutritionPageState,
  draft: {
    name: string;
    mealType: string;
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    notes: string;
    foodCatalogItemId?: string;
  }
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return { ...state, saveNotice: 'Plan needs a meal name.' };
  }

  const [catalogItems, planSlots] = await Promise.all([
    listFoodCatalogItemsServer(),
    listPlanSlotsForDayServer(state.localDay),
  ]);
  const resolution = resolveNutritionPlannedMeal(planSlots, catalogItems);
  if (resolution.candidate?.kind === 'plan-slot-food') {
    return {
      ...state,
      saveNotice: 'Today already has a planned meal from Plan. Update it there instead.',
    };
  }

  const weeklyPlan = await ensureWeeklyPlanServer(state.localDay);
  const foodCatalogItemId = await resolveNutritionPlannedFoodIdServer(draft);
  await savePlanSlotServer({
    weeklyPlanId: weeklyPlan.id,
    localDay: state.localDay,
    slotType: 'meal',
    itemType: 'food',
    itemId: foodCatalogItemId,
    mealType: draft.mealType,
    title: draft.name.trim(),
    notes: draft.notes.trim() || undefined,
  });

  return await refreshNutritionPageAfterMutationServer(
    state,
    { saveNotice: 'Planned next meal saved.' },
    state.localDay
  );
}

export async function clearNutritionPlannedMealServer(
  state: NutritionPageState
): Promise<NutritionPageState> {
  if (state.plannedMealSlotId) {
    await deletePlanSlotServer(state.plannedMealSlotId);
  }

  return await refreshNutritionPageAfterMutationServer(
    state,
    { saveNotice: 'Planned meal cleared.' },
    state.plannedMealSlotId ? state.localDay : undefined
  );
}

export async function reuseNutritionMealServer(
  state: NutritionPageState,
  favoriteMealId: string
): Promise<NutritionPageState> {
  const { db } = getServerDrizzleClient();
  const favorite = await selectMirrorRecordById<FavoriteMeal>(
    db,
    drizzleSchema.favoriteMeals,
    favoriteMealId
  );
  if (!favorite) {
    throw new Error('Favorite meal not found');
  }

  for (const item of favorite.items) {
    await createFoodEntryServer({
      localDay: state.localDay,
      mealType: favorite.mealType,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      fiber: item.fiber,
      carbs: item.carbs,
      fat: item.fat,
      sourceName: item.sourceName,
      favoriteMealId: favorite.id,
    });
  }

  return await refreshNutritionPageAfterMutationServer(
    state,
    { saveNotice: 'Recurring meal reused.' },
    state.localDay
  );
}
