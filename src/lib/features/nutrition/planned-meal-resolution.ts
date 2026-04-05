import type { HealthDatabase } from '$lib/core/db/types';
import type { FoodCatalogItem, PlanSlot, PlannedMeal } from '$lib/core/domain/types';
import { listPlanSlotsForDay } from '$lib/features/planning/service';
import { getPlannedMeal, listFoodCatalogItems } from './service';

export interface NutritionPlannedMealCandidate {
  kind: 'standalone' | 'plan-slot-food';
  meal: PlannedMeal;
  slotId?: string;
}

export interface NutritionPlannedMealResolution {
  candidate: NutritionPlannedMealCandidate | null;
  compatibilityNotice: string | null;
  issue: string | null;
}

function buildPlannedMealFromFoodSlot(
  slot: PlanSlot,
  foodCatalogItems: FoodCatalogItem[]
): NutritionPlannedMealCandidate | null {
  if (
    slot.slotType !== 'meal' ||
    slot.itemType !== 'food' ||
    !slot.itemId ||
    slot.status !== 'planned'
  ) {
    return null;
  }

  const food = foodCatalogItems.find((candidate) => candidate.id === slot.itemId);
  if (!food) {
    return null;
  }

  return {
    kind: 'plan-slot-food',
    slotId: slot.id,
    meal: {
      id: `planned-slot:${slot.id}`,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
      name: slot.title,
      mealType: slot.mealType ?? 'meal',
      calories: food.calories,
      protein: food.protein,
      fiber: food.fiber,
      carbs: food.carbs,
      fat: food.fat,
      sourceName: food.sourceName,
      notes: slot.notes,
    },
  };
}

export function resolveNutritionPlannedMeal(
  explicitPlannedMeal: PlannedMeal | null,
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[]
): NutritionPlannedMealResolution {
  for (const slot of planSlots) {
    const candidate = buildPlannedMealFromFoodSlot(slot, foodCatalogItems);
    if (candidate) {
      return {
        candidate,
        compatibilityNotice: null,
        issue: null,
      };
    }

    if (
      slot.slotType === 'meal' &&
      slot.itemType === 'food' &&
      slot.itemId &&
      slot.status === 'planned'
    ) {
      return {
        candidate: null,
        compatibilityNotice: null,
        issue: 'That planned meal no longer exists. Replace it in Plan before using it.',
      };
    }
  }

  if (explicitPlannedMeal) {
    return {
      candidate: {
        kind: 'standalone',
        meal: explicitPlannedMeal,
      },
      compatibilityNotice:
        'This planned meal is using the legacy fallback flow. Weekly plan slots take priority when they exist.',
      issue: null,
    };
  }

  return {
    candidate: null,
    compatibilityNotice: null,
    issue: null,
  };
}

export async function getNutritionPlannedMealResolution(
  db: HealthDatabase,
  localDay: string
): Promise<NutritionPlannedMealResolution> {
  const [plannedMeal, planSlots, foodCatalogItems] = await Promise.all([
    getPlannedMeal(db),
    listPlanSlotsForDay(db, localDay),
    listFoodCatalogItems(db),
  ]);

  return resolveNutritionPlannedMeal(plannedMeal, planSlots, foodCatalogItems);
}

export async function listStalePlannedFoodSlotIds(
  db: HealthDatabase,
  localDay: string
): Promise<string[]> {
  const [planSlots, foodCatalogItems] = await Promise.all([
    listPlanSlotsForDay(db, localDay),
    listFoodCatalogItems(db),
  ]);

  return planSlots
    .filter(
      (slot) =>
        slot.slotType === 'meal' &&
        slot.itemType === 'food' &&
        slot.itemId &&
        slot.status === 'planned' &&
        !foodCatalogItems.some((candidate) => candidate.id === slot.itemId)
    )
    .map((slot) => slot.id);
}
