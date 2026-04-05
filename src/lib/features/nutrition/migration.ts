import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { FoodCatalogItem, PlannedMeal } from '$lib/core/domain/types';
import { createRecordId } from '$lib/core/shared/ids';
import { createRecordMeta } from '$lib/core/shared/records';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { listPlanSlotsForDay } from '$lib/features/planning/service';
import { clearPlannedMeal, getPlannedMeal } from './legacy-planned-meal-store';
import { listFoodCatalogItems, upsertFoodCatalogItem } from './service';

const LEGACY_PLANNED_MEAL_NOTICE = 'Legacy planned meal moved into today’s weekly plan.';

function matchesLegacyPlannedMeal(item: FoodCatalogItem, plannedMeal: PlannedMeal): boolean {
  return (
    item.name === plannedMeal.name &&
    item.sourceType === 'custom' &&
    item.sourceName === (plannedMeal.sourceName ?? 'Legacy planned meal') &&
    (item.calories ?? 0) === (plannedMeal.calories ?? 0) &&
    (item.protein ?? 0) === (plannedMeal.protein ?? 0) &&
    (item.fiber ?? 0) === (plannedMeal.fiber ?? 0) &&
    (item.carbs ?? 0) === (plannedMeal.carbs ?? 0) &&
    (item.fat ?? 0) === (plannedMeal.fat ?? 0)
  );
}

async function resolveLegacyPlannedMealFood(
  db: HealthDatabase,
  plannedMeal: PlannedMeal
): Promise<FoodCatalogItem> {
  const existing = (await listFoodCatalogItems(db)).find((item) =>
    matchesLegacyPlannedMeal(item, plannedMeal)
  );
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  return await upsertFoodCatalogItem(db, {
    ...createRecordMeta(createRecordId('food-catalog'), timestamp),
    name: plannedMeal.name,
    sourceType: 'custom',
    sourceName: plannedMeal.sourceName ?? 'Legacy planned meal',
    calories: plannedMeal.calories,
    protein: plannedMeal.protein,
    fiber: plannedMeal.fiber,
    carbs: plannedMeal.carbs,
    fat: plannedMeal.fat,
    brandName: undefined,
    externalId: undefined,
    barcode: undefined,
    imageUrl: undefined,
    ingredientsText: undefined,
    servingAmount: undefined,
    servingUnit: undefined,
    lastVerifiedAt: undefined,
  });
}

export async function migrateLegacyPlannedMealToPlanSlot(
  db: HealthDatabase,
  localDay: string
): Promise<{ notice: string | null }> {
  const legacyPlannedMeal = await getPlannedMeal(db);
  if (!legacyPlannedMeal) {
    return { notice: null };
  }

  const existingMealSlots = (await listPlanSlotsForDay(db, localDay)).filter(
    (slot) => slot.slotType === 'meal' && slot.status === 'planned'
  );
  if (existingMealSlots.length) {
    await clearPlannedMeal(db);
    return { notice: null };
  }

  const food = await resolveLegacyPlannedMealFood(db, legacyPlannedMeal);
  const weeklyPlan = await ensureWeeklyPlan(db, localDay);
  await savePlanSlot(db, {
    weeklyPlanId: weeklyPlan.id,
    localDay,
    slotType: 'meal',
    itemType: 'food',
    itemId: food.id,
    mealType: legacyPlannedMeal.mealType,
    title: legacyPlannedMeal.name,
    notes: legacyPlannedMeal.notes,
  });
  await clearPlannedMeal(db);

  return { notice: LEGACY_PLANNED_MEAL_NOTICE };
}

export async function loadWithLegacyPlannedMealMigration<T>(
  db: HealthDatabase,
  localDay: string,
  loadData: () => Promise<T>
): Promise<{ data: T; notice: string | null }> {
  const migration = await migrateLegacyPlannedMealToPlanSlot(db, localDay);
  return {
    data: await loadData(),
    notice: migration.notice,
  };
}
