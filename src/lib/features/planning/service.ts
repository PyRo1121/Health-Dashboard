import type { HealthDbPlanSlotsStore, HealthDbWeeklyPlansStore } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
  ExerciseCatalogItem,
  FoodCatalogItem,
  GroceryItem,
  PlanSlot,
  RecipeCatalogItem,
  WeeklyPlan,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { createRecordId } from '$lib/core/shared/ids';
import { sortPlanSlots } from '$lib/core/shared/plan-slots';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import {
  deriveWeeklyGroceriesWithWarnings,
  type GroceryServiceStore,
} from '$lib/features/groceries/service';
import {
  listExerciseCatalogItems,
  listWorkoutTemplates,
  type MovementStorage,
} from '$lib/features/movement/service';
import {
  listFoodCatalogItems,
  listRecipeCatalogItems,
  type FoodCatalogItemsStore,
  type RecipeCatalogItemsStore,
} from '$lib/features/nutrition/store';

export const DEFAULT_WEEKLY_PLAN_TITLE = 'This Week';

export type WeeklyPlansStore = HealthDbWeeklyPlansStore;

export type PlanSlotsStore = HealthDbPlanSlotsStore;

export interface PlanningStorage
  extends
    WeeklyPlansStore,
    PlanSlotsStore,
    FoodCatalogItemsStore,
    RecipeCatalogItemsStore,
    MovementStorage,
    GroceryServiceStore {}

export function weekDaysFromStart(weekStart: string): string[] {
  const first = new Date(`${weekStart}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(first);
    next.setUTCDate(first.getUTCDate() + index);
    return next.toISOString().slice(0, 10);
  });
}

function nextPlanSlotOrder(slots: PlanSlot[]): number {
  if (!slots.length) {
    return 0;
  }

  return Math.max(...slots.map((slot) => slot.order)) + 1;
}

async function persistOrderedSlots(store: PlanSlotsStore, slots: PlanSlot[]): Promise<void> {
  for (const [index, slot] of slots.entries()) {
    await store.planSlots.put({
      ...slot,
      ...updateRecordMeta(slot, slot.id),
      order: index,
    });
  }
}

async function requirePlanSlot(store: PlanSlotsStore, slotId: string): Promise<PlanSlot> {
  const existing = await store.planSlots.get(slotId);
  if (!existing) {
    throw new Error('Plan slot not found');
  }

  return existing;
}

async function listSiblingPlanSlots(
  store: PlanSlotsStore,
  slot: Pick<PlanSlot, 'weeklyPlanId' | 'localDay'>
) {
  return await store.planSlots
    .where('weeklyPlanId')
    .equals(slot.weeklyPlanId)
    .and((candidate) => candidate.localDay === slot.localDay)
    .toArray();
}

async function persistPlanSlot(
  store: PlanSlotsStore,
  existing: PlanSlot,
  updates: Partial<PlanSlot>
): Promise<PlanSlot> {
  const slot: PlanSlot = {
    ...existing,
    ...updateRecordMeta(existing, existing.id),
    ...updates,
  };

  await store.planSlots.put(slot);
  return slot;
}

export async function ensureWeeklyPlan(
  store: WeeklyPlansStore,
  anchorDay: string
): Promise<WeeklyPlan> {
  const weekStart = startOfWeek(anchorDay);
  const existing = await store.weeklyPlans.where('weekStart').equals(weekStart).first();
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const plan: WeeklyPlan = {
    ...createRecordMeta(createRecordId('weekly-plan'), timestamp),
    weekStart,
    title: DEFAULT_WEEKLY_PLAN_TITLE,
  };

  await store.weeklyPlans.put(plan);
  return plan;
}

export async function listWeeklyPlanSlots(
  store: PlanSlotsStore,
  weeklyPlanId: string
): Promise<PlanSlot[]> {
  return sortPlanSlots(await store.planSlots.where('weeklyPlanId').equals(weeklyPlanId).toArray());
}

export async function listPlanSlotsForDay(
  store: PlanSlotsStore,
  localDay: string
): Promise<PlanSlot[]> {
  return sortPlanSlots(await store.planSlots.where('localDay').equals(localDay).toArray());
}

export async function savePlanSlot(
  store: PlanSlotsStore,
  input: {
    weeklyPlanId: string;
    localDay: string;
    slotType: PlanSlot['slotType'];
    itemType: PlanSlot['itemType'];
    itemId?: string;
    mealType?: string;
    title: string;
    notes?: string;
  }
): Promise<PlanSlot> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Plan slot title is required');
  }

  const existingSlots = await store.planSlots
    .where('weeklyPlanId')
    .equals(input.weeklyPlanId)
    .and((slot) => slot.localDay === input.localDay)
    .toArray();
  const timestamp = nowIso();
  const slot: PlanSlot = {
    ...createRecordMeta(createRecordId('plan-slot'), timestamp),
    weeklyPlanId: input.weeklyPlanId,
    localDay: input.localDay,
    slotType: input.slotType,
    itemType: input.itemType,
    itemId: input.itemId,
    mealType: input.slotType === 'meal' ? input.mealType : undefined,
    title,
    notes: input.notes?.trim() || undefined,
    status: 'planned',
    order: nextPlanSlotOrder(existingSlots),
  };

  await store.planSlots.put(slot);
  return slot;
}

export async function updatePlanSlotStatus(
  store: PlanSlotsStore,
  slotId: string,
  status: PlanSlot['status']
): Promise<PlanSlot> {
  const existing = await requirePlanSlot(store, slotId);
  return await persistPlanSlot(store, existing, { status });
}

export async function updatePlanSlot(
  store: PlanSlotsStore,
  slotId: string,
  updates: {
    itemType?: PlanSlot['itemType'];
    itemId?: string;
    mealType?: string;
    title?: string;
    notes?: string;
    status?: PlanSlot['status'];
  }
): Promise<PlanSlot> {
  const existing = await requirePlanSlot(store, slotId);

  const nextTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
  if (!nextTitle) {
    throw new Error('Plan slot title is required');
  }
  return await persistPlanSlot(store, existing, {
    itemType: updates.itemType ?? existing.itemType,
    itemId: updates.itemId,
    mealType: existing.slotType === 'meal' ? (updates.mealType ?? existing.mealType) : undefined,
    title: nextTitle,
    notes: updates.notes !== undefined ? updates.notes.trim() || undefined : existing.notes,
    status: updates.status ?? existing.status,
  });
}

export async function deletePlanSlot(store: PlanSlotsStore, slotId: string): Promise<void> {
  const existing = await store.planSlots.get(slotId);
  await store.planSlots.delete(slotId);
  if (!existing) {
    return;
  }

  const siblings = await listSiblingPlanSlots(store, existing);
  await persistOrderedSlots(store, sortPlanSlots(siblings));
}

export async function movePlanSlot(
  store: PlanSlotsStore,
  slotId: string,
  direction: 'up' | 'down'
): Promise<PlanSlot[]> {
  const existing = await requirePlanSlot(store, slotId);

  const siblings = sortPlanSlots(await listSiblingPlanSlots(store, existing));
  const currentIndex = siblings.findIndex((slot) => slot.id === slotId);
  if (currentIndex < 0) {
    throw new Error('Plan slot not found');
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return siblings;
  }

  const reordered = [...siblings];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(targetIndex, 0, moved!);
  await persistOrderedSlots(store, reordered);
  return await listWeeklyPlanSlots(store, existing.weeklyPlanId);
}

export function buildWeeklyPlanSnapshotFromData(input: {
  weeklyPlan: WeeklyPlan;
  slots: PlanSlot[];
  groceryItems: GroceryItem[];
  groceryWarnings: string[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
}): {
  weeklyPlan: WeeklyPlan;
  weekDays: string[];
  slots: PlanSlot[];
  groceryItems: GroceryItem[];
  groceryWarnings: string[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
} {
  return {
    weeklyPlan: input.weeklyPlan,
    weekDays: weekDaysFromStart(input.weeklyPlan.weekStart),
    slots: input.slots,
    groceryItems: input.groceryItems,
    groceryWarnings: input.groceryWarnings,
    foodCatalogItems: input.foodCatalogItems,
    recipeCatalogItems: input.recipeCatalogItems,
    workoutTemplates: input.workoutTemplates,
    exerciseCatalogItems: input.exerciseCatalogItems,
  };
}

export async function getWeeklyPlanSnapshot(
  store: PlanningStorage,
  anchorDay: string
): Promise<{
  weeklyPlan: WeeklyPlan;
  weekDays: string[];
  slots: PlanSlot[];
  groceryItems: GroceryItem[];
  groceryWarnings: string[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
}> {
  const weeklyPlan = await ensureWeeklyPlan(store, anchorDay);
  const [slots, foodCatalogItems, recipeCatalogItems, workoutTemplates, exerciseCatalogItems] =
    await Promise.all([
      listWeeklyPlanSlots(store, weeklyPlan.id),
      listFoodCatalogItems(store),
      listRecipeCatalogItems(store),
      listWorkoutTemplates(store),
      listExerciseCatalogItems(store),
    ]);
  const groceryResult = await deriveWeeklyGroceriesWithWarnings(
    store,
    weeklyPlan.id,
    recipeCatalogItems
  );

  return buildWeeklyPlanSnapshotFromData({
    weeklyPlan,
    slots,
    groceryItems: groceryResult.items,
    groceryWarnings: groceryResult.warnings,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
  });
}
