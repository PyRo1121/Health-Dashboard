import type { FavoriteMeal } from '$lib/core/domain/types';
import type {
  NutritionMealDraft,
  NutritionPlannedMealDraft,
  NutritionRecurringMealDraft,
} from '$lib/features/nutrition/actions';
import {
  listStalePlannedMealSlotIdsFromData,
  resolveNutritionPlannedMeal,
} from '$lib/features/nutrition/planned-meal-resolution';
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
  listRecipeCatalogItemsServer,
  savePlanSlotServer,
} from '$lib/server/planning/store';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordById } from '$lib/server/db/drizzle/mirror';

async function deleteStalePlannedFoodSlotsServer(slotIds: string[]): Promise<void> {
  // deletePlanSlotServer reindexes same-day siblings after each removal, so stale
  // slots must be deleted in series to avoid reintroducing a sibling mid-cleanup.
  for (const slotId of slotIds) {
    await deletePlanSlotServer(slotId);
  }
}

export async function saveNutritionMealServer(
  state: NutritionPageState,
  draft: NutritionMealDraft
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
  draft: NutritionRecurringMealDraft
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
  draft: NutritionPlannedMealDraft
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return { ...state, saveNotice: 'Plan needs a meal name.' };
  }

  const [catalogItems, planSlots] = await Promise.all([
    listFoodCatalogItemsServer(),
    listPlanSlotsForDayServer(state.localDay),
  ]);
  const recipeCatalogItems = await listRecipeCatalogItemsServer();
  const resolution = resolveNutritionPlannedMeal(planSlots, catalogItems, recipeCatalogItems);
  if (resolution.candidate) {
    return {
      ...state,
      saveNotice: 'Today already has a planned meal from Plan. Update it there instead.',
    };
  }

  const staleSlotIds = listStalePlannedMealSlotIdsFromData(
    planSlots,
    catalogItems,
    recipeCatalogItems
  );
  await deleteStalePlannedFoodSlotsServer(staleSlotIds);

  const weeklyPlan = await ensureWeeklyPlanServer(state.localDay);
  if (draft.recipeCatalogItemId) {
    const recipe = recipeCatalogItems.find(
      (candidate) => candidate.id === draft.recipeCatalogItemId
    );
    if (!recipe) {
      return {
        ...state,
        saveNotice: 'That recipe no longer exists. Choose another before planning it.',
      };
    }

    await savePlanSlotServer({
      weeklyPlanId: weeklyPlan.id,
      localDay: state.localDay,
      slotType: 'meal',
      itemType: 'recipe',
      itemId: recipe.id,
      mealType: draft.mealType,
      title: recipe.title,
      notes: draft.notes.trim() || undefined,
    });

    return await refreshNutritionPageAfterMutationServer(
      state,
      { saveNotice: 'Planned next meal saved.' },
      state.localDay
    );
  }

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
  const [catalogItems, planSlots] = await Promise.all([
    listFoodCatalogItemsServer(),
    listPlanSlotsForDayServer(state.localDay),
  ]);
  const staleSlotIds = listStalePlannedMealSlotIdsFromData(
    planSlots,
    catalogItems,
    await listRecipeCatalogItemsServer()
  );

  if (state.plannedMealSlotId) {
    await deletePlanSlotServer(state.plannedMealSlotId);
  }

  await deleteStalePlannedFoodSlotsServer(staleSlotIds);

  return await refreshNutritionPageAfterMutationServer(
    state,
    { saveNotice: 'Planned meal cleared.' },
    state.plannedMealSlotId || staleSlotIds.length ? state.localDay : undefined
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
