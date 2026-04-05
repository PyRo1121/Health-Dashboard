import type { PlannedMeal } from '$lib/core/domain/types';
import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import { updateRecordMeta } from '$lib/core/shared/records';

const NEXT_PLANNED_MEAL_ID = 'planned-meal:next';

export async function getPlannedMeal(db: HealthDatabase): Promise<PlannedMeal | null> {
  return (await db.plannedMeals.get(NEXT_PLANNED_MEAL_ID)) ?? null;
}

export async function savePlannedMeal(
  db: HealthDatabase,
  input: Omit<PlannedMeal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PlannedMeal> {
  const timestamp = nowIso();
  const existing = await getPlannedMeal(db);
  const meal: PlannedMeal = {
    ...updateRecordMeta(existing, NEXT_PLANNED_MEAL_ID, timestamp),
    name: input.name,
    mealType: input.mealType,
    calories: input.calories,
    protein: input.protein,
    fiber: input.fiber,
    carbs: input.carbs,
    fat: input.fat,
    sourceName: input.sourceName,
    notes: input.notes,
  };

  await db.plannedMeals.put(meal);
  return meal;
}

export async function clearPlannedMeal(db: HealthDatabase): Promise<void> {
  await db.plannedMeals.delete(NEXT_PLANNED_MEAL_ID);
}
