import type {
  FoodCatalogItem,
  PlanSlot,
  PlannedMeal,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import type { NutritionDraftSource } from './model';
import { listPlanSlotsForDay, type PlanSlotsStore } from '$lib/features/planning/service';
import {
  listFoodCatalogItems,
  listRecipeCatalogItems,
  type FoodCatalogItemsStore,
  type RecipeCatalogItemsStore,
} from './store';

export interface NutritionPlannedMealStore
  extends PlanSlotsStore, FoodCatalogItemsStore, RecipeCatalogItemsStore {}

export interface NutritionPlannedMealCandidate {
  kind: 'plan-slot-food' | 'plan-slot-recipe';
  meal: PlannedMeal;
  slotId?: string;
  source: NutritionDraftSource;
}

export interface NutritionPlannedMealResolution {
  candidate: NutritionPlannedMealCandidate | null;
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
    source: {
      kind: 'food',
      id: food.id,
      sourceName: food.sourceName,
    },
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

function buildPlannedMealFromRecipeSlot(
  slot: PlanSlot,
  recipeCatalogItems: RecipeCatalogItem[]
): NutritionPlannedMealCandidate | null {
  if (
    slot.slotType !== 'meal' ||
    slot.itemType !== 'recipe' ||
    !slot.itemId ||
    slot.status !== 'planned'
  ) {
    return null;
  }

  const recipe = recipeCatalogItems.find((candidate) => candidate.id === slot.itemId);
  if (!recipe) {
    return null;
  }

  return {
    kind: 'plan-slot-recipe',
    slotId: slot.id,
    source: {
      kind: 'recipe',
      id: recipe.id,
      sourceName: recipe.sourceName,
    },
    meal: {
      id: `planned-slot:${slot.id}`,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
      name: slot.title,
      mealType: slot.mealType ?? recipe.mealType ?? 'meal',
      sourceName: recipe.sourceName,
      notes: slot.notes ?? (recipe.ingredients.slice(0, 4).join(', ') || undefined),
    },
  };
}

export function resolveNutritionPlannedMeal(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: RecipeCatalogItem[] = []
): NutritionPlannedMealResolution {
  let sawStalePlannedFoodSlot = false;
  let sawStalePlannedRecipeSlot = false;

  for (const slot of planSlots) {
    const candidate = buildPlannedMealFromFoodSlot(slot, foodCatalogItems);
    if (candidate) {
      return {
        candidate,
        issue: null,
      };
    }

    const recipeCandidate = buildPlannedMealFromRecipeSlot(slot, recipeCatalogItems);
    if (recipeCandidate) {
      return {
        candidate: recipeCandidate,
        issue: null,
      };
    }

    if (
      slot.slotType === 'meal' &&
      slot.itemType === 'food' &&
      slot.itemId &&
      slot.status === 'planned'
    ) {
      sawStalePlannedFoodSlot = true;
    }

    if (
      slot.slotType === 'meal' &&
      slot.itemType === 'recipe' &&
      slot.itemId &&
      slot.status === 'planned'
    ) {
      sawStalePlannedRecipeSlot = true;
    }
  }

  if (sawStalePlannedFoodSlot || sawStalePlannedRecipeSlot) {
    return {
      candidate: null,
      issue: 'That planned meal no longer exists. Replace it in Plan before using it.',
    };
  }

  return {
    candidate: null,
    issue: null,
  };
}

export function listStalePlannedFoodSlotIdsFromData(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[]
): string[] {
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

export function listStalePlannedMealSlotIdsFromData(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: RecipeCatalogItem[] = []
): string[] {
  return planSlots
    .filter((slot) => {
      if (slot.slotType !== 'meal' || !slot.itemId || slot.status !== 'planned') {
        return false;
      }

      if (slot.itemType === 'food') {
        return !foodCatalogItems.some((candidate) => candidate.id === slot.itemId);
      }

      if (slot.itemType === 'recipe') {
        return !recipeCatalogItems.some((candidate) => candidate.id === slot.itemId);
      }

      return false;
    })
    .map((slot) => slot.id);
}

export async function getNutritionPlannedMealResolution(
  store: NutritionPlannedMealStore,
  localDay: string
): Promise<NutritionPlannedMealResolution> {
  const [planSlots, foodCatalogItems, recipeCatalogItems] = await Promise.all([
    listPlanSlotsForDay(store, localDay),
    listFoodCatalogItems(store),
    listRecipeCatalogItems(store),
  ]);

  return resolveNutritionPlannedMeal(planSlots, foodCatalogItems, recipeCatalogItems);
}

export async function listStalePlannedFoodSlotIds(
  store: NutritionPlannedMealStore,
  localDay: string
): Promise<string[]> {
  const [planSlots, foodCatalogItems] = await Promise.all([
    listPlanSlotsForDay(store, localDay),
    listFoodCatalogItems(store),
  ]);

  return listStalePlannedFoodSlotIdsFromData(planSlots, foodCatalogItems);
}

export async function listStalePlannedMealSlotIds(
  store: NutritionPlannedMealStore,
  localDay: string
): Promise<string[]> {
  const [planSlots, foodCatalogItems, recipeCatalogItems] = await Promise.all([
    listPlanSlotsForDay(store, localDay),
    listFoodCatalogItems(store),
    listRecipeCatalogItems(store),
  ]);

  return listStalePlannedMealSlotIdsFromData(planSlots, foodCatalogItems, recipeCatalogItems);
}
