import type { HealthDatabase } from '$lib/core/db/types';
import {
  createFoodEntry,
  reuseRecurringMeal,
  saveFavoriteMeal,
  saveFoodCatalogItem,
} from './service';
import {
  getNutritionPlannedMealResolution,
  listStalePlannedFoodSlotIds,
} from './planned-meal-resolution';
import { deletePlanSlot, ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { refreshWeeklyReviewArtifacts } from '$lib/features/review/service';
import { type NutritionPageState, reloadNutritionPageState } from './state';

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

async function resolveNutritionPlannedFoodId(
  db: HealthDatabase,
  draft: NutritionPlannedMealDraft
): Promise<string> {
  if (draft.foodCatalogItemId) {
    const existing = await db.foodCatalogItems.get(draft.foodCatalogItemId);
    if (existing) {
      return existing.id;
    }
  }

  const food = await saveFoodCatalogItem(db, {
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

export async function saveNutritionMeal(
  db: HealthDatabase,
  state: NutritionPageState,
  draft: NutritionMealDraft
): Promise<NutritionPageState> {
  await createFoodEntry(db, draft);
  await refreshWeeklyReviewArtifacts(db, draft.localDay);
  return await reloadNutritionPageState(db, state, {
    saveNotice: 'Meal saved.',
  });
}

export async function saveNutritionRecurringMeal(
  db: HealthDatabase,
  state: NutritionPageState,
  draft: NutritionRecurringMealDraft
): Promise<NutritionPageState> {
  await saveFavoriteMeal(db, {
    name: draft.name || 'Quick oatmeal',
    mealType: draft.mealType,
    items: [createRecurringMealItem(draft)],
  });

  return await reloadNutritionPageState(db, state, {
    saveNotice: 'Recurring meal saved.',
  });
}

export async function saveNutritionCatalogItem(
  db: HealthDatabase,
  state: NutritionPageState,
  draft: NutritionCatalogItemDraft
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return {
      ...state,
      saveNotice: 'Custom food name is required.',
    };
  }

  await saveFoodCatalogItem(db, {
    name: draft.name.trim(),
    calories: draft.calories,
    protein: draft.protein,
    fiber: draft.fiber,
    carbs: draft.carbs,
    fat: draft.fat,
  });

  return await reloadNutritionPageState(db, state, {
    saveNotice: 'Saved to custom food catalog.',
  });
}

export async function planNutritionMeal(
  db: HealthDatabase,
  state: NutritionPageState,
  draft: NutritionPlannedMealDraft
): Promise<NutritionPageState> {
  if (!draft.name.trim()) {
    return {
      ...state,
      saveNotice: 'Plan needs a meal name.',
    };
  }

  const resolution = await getNutritionPlannedMealResolution(db, state.localDay);
  if (resolution.candidate?.kind === 'plan-slot-food') {
    return {
      ...state,
      saveNotice: 'Today already has a planned meal from Plan. Update it there instead.',
    };
  }

  const staleSlotIds = await listStalePlannedFoodSlotIds(db, state.localDay);
  await Promise.all(staleSlotIds.map((slotId) => deletePlanSlot(db, slotId)));

  const weeklyPlan = await ensureWeeklyPlan(db, state.localDay);
  const foodCatalogItemId = await resolveNutritionPlannedFoodId(db, draft);
  await savePlanSlot(db, {
    weeklyPlanId: weeklyPlan.id,
    localDay: state.localDay,
    slotType: 'meal',
    itemType: 'food',
    itemId: foodCatalogItemId,
    mealType: draft.mealType,
    title: draft.name.trim(),
    notes: draft.notes.trim() || undefined,
  });
  await refreshWeeklyReviewArtifacts(db, state.localDay);

  return await reloadNutritionPageState(db, state, {
    saveNotice: 'Planned next meal saved.',
  });
}

export async function clearNutritionPlannedMeal(
  db: HealthDatabase,
  state: NutritionPageState
): Promise<NutritionPageState> {
  if (state.plannedMealSlotId) {
    await deletePlanSlot(db, state.plannedMealSlotId);
    await refreshWeeklyReviewArtifacts(db, state.localDay);
  }

  return await reloadNutritionPageState(db, state, {
    saveNotice: 'Planned meal cleared.',
  });
}

export async function reuseNutritionMeal(
  db: HealthDatabase,
  state: NutritionPageState,
  favoriteMealId: string
): Promise<NutritionPageState> {
  await reuseRecurringMeal(db, { favoriteMealId, localDay: state.localDay });
  await refreshWeeklyReviewArtifacts(db, state.localDay);
  return await reloadNutritionPageState(db, state, {
    saveNotice: 'Recurring meal reused.',
  });
}
