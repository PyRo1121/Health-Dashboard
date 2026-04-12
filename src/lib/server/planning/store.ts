import { eq } from 'drizzle-orm';
import type {
  DerivedGroceryItem,
  ExerciseCatalogItem,
  FoodCatalogItem,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
  WeeklyPlan,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { createRecordId } from '$lib/core/shared/ids';
import { sortPlanSlots } from '$lib/core/shared/plan-slots';
import { createRecordMeta, updateRecordMeta } from '$lib/core/shared/records';
import { buildWorkoutTemplateRecord } from '$lib/features/movement/service';
import { DEFAULT_WEEKLY_PLAN_TITLE } from '$lib/features/planning/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectAllMirrorRecords,
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
} from '$lib/server/db/drizzle/mirror';

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function sortByTitle<T extends { title: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.title.localeCompare(right.title));
}

export async function listFoodCatalogItemsServer(): Promise<FoodCatalogItem[]> {
  const { db } = getServerDrizzleClient();
  return sortByName(await selectAllMirrorRecords<FoodCatalogItem>(db, drizzleSchema.foodCatalogItems));
}

export async function listRecipeCatalogItemsServer(): Promise<RecipeCatalogItem[]> {
  const { db } = getServerDrizzleClient();
  return sortByTitle(await selectAllMirrorRecords<RecipeCatalogItem>(db, drizzleSchema.recipeCatalogItems));
}

export async function listWorkoutTemplatesServer(): Promise<WorkoutTemplate[]> {
  const { db } = getServerDrizzleClient();
  return sortByTitle(await selectAllMirrorRecords<WorkoutTemplate>(db, drizzleSchema.workoutTemplates));
}

export async function listExerciseCatalogItemsServer(): Promise<ExerciseCatalogItem[]> {
  const { db } = getServerDrizzleClient();
  return sortByTitle(
    await selectAllMirrorRecords<ExerciseCatalogItem>(db, drizzleSchema.exerciseCatalogItems)
  );
}

export async function listWeeklyPlanSlotsServer(weeklyPlanId: string): Promise<PlanSlot[]> {
  const { db } = getServerDrizzleClient();
  return sortPlanSlots(
    await selectMirrorRecordsByField<PlanSlot>(db, drizzleSchema.planSlots, 'weeklyPlanId', weeklyPlanId)
  );
}

export async function listPlanSlotsForDayServer(localDay: string): Promise<PlanSlot[]> {
  const { db } = getServerDrizzleClient();
  return sortPlanSlots(
    await selectMirrorRecordsByField<PlanSlot>(db, drizzleSchema.planSlots, 'localDay', localDay)
  );
}

export async function listDerivedGroceriesServer(
  weeklyPlanId: string
): Promise<DerivedGroceryItem[]> {
  const { db } = getServerDrizzleClient();
  return await selectMirrorRecordsByField<DerivedGroceryItem>(
    db,
    drizzleSchema.derivedGroceryItems,
    'weeklyPlanId',
    weeklyPlanId
  );
}

export async function listManualGroceriesServer(weeklyPlanId: string): Promise<ManualGroceryItem[]> {
  const { db } = getServerDrizzleClient();
  return await selectMirrorRecordsByField<ManualGroceryItem>(
    db,
    drizzleSchema.manualGroceryItems,
    'weeklyPlanId',
    weeklyPlanId
  );
}

export async function ensureWeeklyPlanServer(anchorDay: string): Promise<WeeklyPlan> {
  const { db } = getServerDrizzleClient();
  const weekStart = startOfWeek(anchorDay);
  const existing = (
    await selectMirrorRecordsByField<WeeklyPlan>(db, drizzleSchema.weeklyPlans, 'weekStart', weekStart)
  )[0];
  if (existing) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const plan: WeeklyPlan = {
    ...createRecordMeta(createRecordId('weekly-plan'), timestamp),
    weekStart,
    title: DEFAULT_WEEKLY_PLAN_TITLE,
  };
  await upsertMirrorRecord(db, 'weeklyPlans', drizzleSchema.weeklyPlans, plan);
  return plan;
}

export async function savePlanSlotServer(input: {
  weeklyPlanId: string;
  localDay: string;
  slotType: PlanSlot['slotType'];
  itemType: PlanSlot['itemType'];
  itemId?: string;
  mealType?: string;
  title: string;
  notes?: string;
}): Promise<PlanSlot> {
  const { db } = getServerDrizzleClient();
  const siblings = (
    await selectMirrorRecordsByField<PlanSlot>(db, drizzleSchema.planSlots, 'weeklyPlanId', input.weeklyPlanId)
  ).filter((slot) => slot.localDay === input.localDay);
  const timestamp = new Date().toISOString();
  const slot: PlanSlot = {
    ...createRecordMeta(createRecordId('plan-slot'), timestamp),
    weeklyPlanId: input.weeklyPlanId,
    localDay: input.localDay,
    slotType: input.slotType,
    itemType: input.itemType,
    itemId: input.itemId,
    mealType: input.slotType === 'meal' ? input.mealType : undefined,
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    status: 'planned',
    order: siblings.length ? Math.max(...siblings.map((slot) => slot.order)) + 1 : 0,
  };
  await upsertMirrorRecord(db, 'planSlots', drizzleSchema.planSlots, slot);
  return slot;
}

export async function updatePlanSlotServer(
  slotId: string,
  updates: Partial<PlanSlot>
): Promise<PlanSlot> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<PlanSlot>(db, drizzleSchema.planSlots, slotId);
  if (!existing) {
    throw new Error('Plan slot not found');
  }

  const next: PlanSlot = {
    ...existing,
    ...updateRecordMeta(existing, existing.id),
    ...updates,
  };
  await upsertMirrorRecord(db, 'planSlots', drizzleSchema.planSlots, next);
  return next;
}

export async function deletePlanSlotServer(slotId: string): Promise<void> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<PlanSlot>(db, drizzleSchema.planSlots, slotId);
  await db.delete(drizzleSchema.planSlots).where(eq(drizzleSchema.planSlots.id, slotId));
  if (!existing) {
    return;
  }

  const siblings = sortPlanSlots(
    (
      await selectMirrorRecordsByField<PlanSlot>(
        db,
        drizzleSchema.planSlots,
        'weeklyPlanId',
        existing.weeklyPlanId
      )
    ).filter((candidate) => candidate.localDay === existing.localDay)
  );

  for (const [index, sibling] of siblings.entries()) {
    if (sibling.order !== index) {
      await upsertMirrorRecord(db, 'planSlots', drizzleSchema.planSlots, {
        ...sibling,
        ...updateRecordMeta(sibling, sibling.id),
        order: index,
      });
    }
  }
}

export async function movePlanSlotServer(
  slotId: string,
  direction: 'up' | 'down'
): Promise<PlanSlot[]> {
  const { db } = getServerDrizzleClient();
  const existing = await selectMirrorRecordById<PlanSlot>(db, drizzleSchema.planSlots, slotId);
  if (!existing) {
    throw new Error('Plan slot not found');
  }

  const siblings = sortPlanSlots(
    (
      await selectMirrorRecordsByField<PlanSlot>(
        db,
        drizzleSchema.planSlots,
        'weeklyPlanId',
        existing.weeklyPlanId
      )
    ).filter((candidate) => candidate.localDay === existing.localDay)
  );

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

  for (const [index, slot] of reordered.entries()) {
    if (slot.order !== index) {
      await upsertMirrorRecord(db, 'planSlots', drizzleSchema.planSlots, {
        ...slot,
        ...updateRecordMeta(slot, slot.id),
        order: index,
      });
    }
  }

  return await listWeeklyPlanSlotsServer(existing.weeklyPlanId);
}

export async function saveWorkoutTemplateServer(input: {
  title: string;
  goal?: string;
  exerciseRefs: WorkoutTemplate['exerciseRefs'];
}): Promise<WorkoutTemplate> {
  const { db } = getServerDrizzleClient();
  const template = buildWorkoutTemplateRecord(input);
  await upsertMirrorRecord(db, 'workoutTemplates', drizzleSchema.workoutTemplates, template);
  return template;
}
