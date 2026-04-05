import type { HealthDatabase } from '$lib/core/db/types';
import type {
  DailyRecord,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  PlannedMeal,
} from '$lib/core/domain/types';
import {
  buildDailyNutritionSummary,
  listFoodCatalogItems,
  listRecipeCatalogItems,
} from '$lib/features/nutrition/service';
import { migrateLegacyPlannedMealToPlanSlot } from '$lib/features/nutrition/migration';
import {
  getNutritionPlannedMealResolution,
  resolveNutritionPlannedMeal,
  type NutritionPlannedMealResolution,
} from '$lib/features/nutrition/planned-meal-resolution';
import { listExerciseCatalogItems, listWorkoutTemplates } from '$lib/features/movement/service';
import { createSlotSummary } from '$lib/features/planning/model';
import { listPlanSlotsForDay } from '$lib/features/planning/service';

export interface TodayPlanItem {
  id: string;
  title: string;
  subtitle: string;
  status: PlanSlot['status'];
}

export interface TodayPlannedWorkout {
  id: string;
  title: string;
  subtitle: string;
  status: PlanSlot['status'];
}

export interface TodaySnapshot {
  date: string;
  dailyRecord: DailyRecord | null;
  foodEntries: FoodEntry[];
  nutritionSummary: {
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
  };
  plannedMeal: PlannedMeal | null;
  plannedMealIssue: string | null;
  plannedWorkout: TodayPlannedWorkout | null;
  plannedWorkoutIssue: string | null;
  planItems: TodayPlanItem[];
  events: HealthEvent[];
  latestJournalEntry: JournalEntry | null;
}

export async function listEventsForDay(db: HealthDatabase, date: string): Promise<HealthEvent[]> {
  return db.healthEvents.where('localDay').equals(date).sortBy('eventType');
}

async function getLatestJournalEntryForDay(
  db: HealthDatabase,
  date: string
): Promise<JournalEntry | null> {
  return (
    (await db.journalEntries.where('localDay').equals(date).sortBy('updatedAt')).at(-1) ?? null
  );
}

function deriveTodayPlannedWorkout(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: Awaited<ReturnType<typeof listRecipeCatalogItems>>,
  workoutTemplates: Awaited<ReturnType<typeof listWorkoutTemplates>>,
  exerciseCatalogItems: Awaited<ReturnType<typeof listExerciseCatalogItems>>
): TodayPlannedWorkout | null {
  for (const slot of planSlots) {
    if (slot.slotType !== 'workout' || slot.status !== 'planned') {
      continue;
    }

    if (slot.itemType === 'workout-template' && slot.itemId) {
      const template = workoutTemplates.find((candidate) => candidate.id === slot.itemId);
      if (!template) {
        continue;
      }
    }

    return {
      id: slot.id,
      title: slot.title,
      subtitle: createSlotSummary(
        slot,
        foodCatalogItems,
        recipeCatalogItems,
        workoutTemplates,
        exerciseCatalogItems
      ),
      status: slot.status,
    };
  }

  return null;
}

function deriveTodayPlannedWorkoutIssue(
  planSlots: PlanSlot[],
  workoutTemplates: Awaited<ReturnType<typeof listWorkoutTemplates>>
): string | null {
  for (const slot of planSlots) {
    if (
      slot.slotType !== 'workout' ||
      slot.itemType !== 'workout-template' ||
      !slot.itemId ||
      slot.status !== 'planned'
    ) {
      continue;
    }

    const exists = workoutTemplates.some((template) => template.id === slot.itemId);
    if (!exists) {
      return 'That planned workout no longer exists. Replace it in Plan before using it today.';
    }
  }

  return null;
}

export async function getTodayPlannedMealResolution(
  db: HealthDatabase,
  date: string
): Promise<NutritionPlannedMealResolution> {
  await migrateLegacyPlannedMealToPlanSlot(db, date);
  return await getNutritionPlannedMealResolution(db, date);
}

export async function getTodaySnapshot(db: HealthDatabase, date: string): Promise<TodaySnapshot> {
  await migrateLegacyPlannedMealToPlanSlot(db, date);
  const [
    dailyRecord,
    nutritionSummary,
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
    events,
    latestJournalEntry,
  ] = await Promise.all([
    db.dailyRecords.where('date').equals(date).first(),
    buildDailyNutritionSummary(db, date),
    listPlanSlotsForDay(db, date),
    listFoodCatalogItems(db),
    listRecipeCatalogItems(db),
    listWorkoutTemplates(db),
    listExerciseCatalogItems(db),
    listEventsForDay(db, date),
    getLatestJournalEntryForDay(db, date),
  ]);

  const planItems: TodayPlanItem[] = planSlots.map((slot) => ({
    id: slot.id,
    title: slot.title,
    subtitle: createSlotSummary(
      slot,
      foodCatalogItems,
      recipeCatalogItems,
      workoutTemplates,
      exerciseCatalogItems
    ),
    status: slot.status,
  }));

  const plannedWorkout = deriveTodayPlannedWorkout(
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems
  );
  const plannedMealResolution = resolveNutritionPlannedMeal(planSlots, foodCatalogItems);
  const plannedWorkoutIssue = plannedWorkout
    ? null
    : deriveTodayPlannedWorkoutIssue(planSlots, workoutTemplates);

  return {
    date,
    dailyRecord: dailyRecord ?? null,
    foodEntries: nutritionSummary.entries,
    nutritionSummary: {
      calories: nutritionSummary.calories,
      protein: nutritionSummary.protein,
      fiber: nutritionSummary.fiber,
      carbs: nutritionSummary.carbs,
      fat: nutritionSummary.fat,
    },
    plannedMeal: plannedMealResolution.candidate?.meal ?? null,
    plannedMealIssue: plannedMealResolution.issue,
    plannedWorkout,
    plannedWorkoutIssue,
    planItems,
    events,
    latestJournalEntry,
  };
}
