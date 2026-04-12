import {
  createFoodEntry,
  reuseRecurringMeal,
  saveFavoriteMeal,
  saveFoodCatalogItem,
  type FoodCatalogItemsStore,
} from './store';
import {
  getNutritionPlannedMealResolution,
  listStalePlannedFoodSlotIds,
} from './planned-meal-resolution';
import {
  deletePlanSlot,
  ensureWeeklyPlan,
  savePlanSlot,
  type WeeklyPlansStore,
} from '$lib/features/planning/service';
import { refreshWeeklyReviewArtifactsSafely, type ReviewStorage } from '$lib/features/review/service';
import { type NutritionPageState, type NutritionPageStorage, reloadNutritionPageState } from './state';

interface NutritionMacroDraft {
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
  sourceName?: string;
}

export interface NutritionMealDraft extends NutritionMacroDraft {
  localDay: string;
  mealType: string;
  notes: string;
}

export interface NutritionRecurringMealDraft extends NutritionMacroDraft {
  mealType: string;
}

export interface NutritionPlannedMealDraft extends NutritionRecurringMealDraft {
  notes: string;
  foodCatalogItemId?: string;
}

export interface NutritionCatalogItemDraft {
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  fat: number;
}

export interface NutritionActionsStorage extends NutritionPageStorage, WeeklyPlansStore, ReviewStorage {}

async function resolveNutritionPlannedFoodId(
  store: FoodCatalogItemsStore,
  draft: NutritionPlannedMealDraft
): Promise<string> {
  if (draft.foodCatalogItemId) {
    const existing = await store.foodCatalogItems.get(draft.foodCatalogItemId);
    if (existing) {
      return existing.id;
    }
  }

  const food = await saveFoodCatalogItem(store, {
    name: draft.name.trim(),
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
  });

  return food.id;
}

function createRecurringMealItem(draft: NutritionRecurringMealDraft) {
  return {
    name: draft.name || 'Untitled meal',
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
    sourceName: draft.sourceName,
  };
}

async function refreshNutritionPageAfterMutation(
  store: NutritionActionsStorage,
  state: NutritionPageState,
  overrides: Partial<NutritionPageState> = {},
  reviewLocalDay?: string
): Promise<NutritionPageState> {
  if (reviewLocalDay) {
    await refreshWeeklyReviewArtifactsSafely(store, reviewLocalDay);
  }

  return await reloadNutritionPageState(store, state, overrides);
}

export async function saveNutritionMeal(
  store: NutritionActionsStorage,
  state: NutritionPageState,
  draft: NutritionMealDraft
): Promise<NutritionPageState> {
  await createFoodEntry(store, draft);
  return await refreshNutritionPageAfterMutation(
    store,
    state,
    {
      saveNotice: 'Meal saved.',
    },
    draft.localDay
  );
}

export async function saveNutritionRecurringMeal(
  store: NutritionActionsStorage,
  state: NutritionPageState,
  draft: NutritionRecurringMealDraft
): Promise<NutritionPageState> {
  await saveFavoriteMeal(store, {
    name: draft.name || 'Quick oatmeal',
    mealType: draft.mealType,
    items: [createRecurringMealItem(draft)],
  });

  return await refreshNutritionPageAfterMutation(store, state, {
    saveNotice: 'Recurring meal saved.',
  });
}

export async function saveNutritionCatalogItem(
  store: NutritionActionsStorage,
  state: NutritionPageState,
  draft: NutritionCatalogItemDraft
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return {
      ...state,
      saveNotice: 'Custom food name is required.',
    };
  }

  await saveFoodCatalogItem(store, {
    name: draft.name.trim(),
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
  });

  return await refreshNutritionPageAfterMutation(store, state, {
    saveNotice: 'Saved to custom food catalog.',
  });
}

export async function planNutritionMeal(
  store: NutritionActionsStorage,
  state: NutritionPageState,
  draft: NutritionPlannedMealDraft
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return {
      ...state,
      saveNotice: 'Plan needs a meal name.',
    };
  }

  const resolution = await getNutritionPlannedMealResolution(store, state.localDay);
  if (resolution.candidate?.kind === 'plan-slot-food') {
    return {
      ...state,
      saveNotice: 'Today already has a planned meal from Plan. Update it there instead.',
    };
  }

  const staleSlotIds = await listStalePlannedFoodSlotIds(store, state.localDay);
  await Promise.all(staleSlotIds.map((slotId) => deletePlanSlot(store, slotId)));

  const weeklyPlan = await ensureWeeklyPlan(store, state.localDay);
  const foodCatalogItemId = await resolveNutritionPlannedFoodId(store, draft);
  await savePlanSlot(store, {
    weeklyPlanId: weeklyPlan.id,
    localDay: state.localDay,
    slotType: 'meal',
    itemType: 'food',
    itemId: foodCatalogItemId,
    mealType: draft.mealType,
    title: draft.name.trim(),
    notes: draft.notes.trim() || undefined,
  });
  return await refreshNutritionPageAfterMutation(
    store,
    state,
    {
      saveNotice: 'Planned next meal saved.',
    },
    state.localDay
  );
}

export async function clearNutritionPlannedMeal(
  store: NutritionActionsStorage,
  state: NutritionPageState
): Promise<NutritionPageState> {
  if (state.plannedMealSlotId) {
    await deletePlanSlot(store, state.plannedMealSlotId);
  }

  return await refreshNutritionPageAfterMutation(
    store,
    state,
    {
      saveNotice: 'Planned meal cleared.',
    },
    state.plannedMealSlotId ? state.localDay : undefined
  );
}

export async function reuseNutritionMeal(
  store: NutritionActionsStorage,
  state: NutritionPageState,
  favoriteMealId: string
): Promise<NutritionPageState> {
  await reuseRecurringMeal(store, { favoriteMealId, localDay: state.localDay });
  return await refreshNutritionPageAfterMutation(
    store,
    state,
    {
      saveNotice: 'Recurring meal reused.',
    },
    state.localDay
  );
}
