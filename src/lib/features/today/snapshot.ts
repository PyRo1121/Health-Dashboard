import type { HealthDbJournalEntriesStore } from '$lib/core/db/types';
import type {
  DailyRecord,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  PlannedMeal,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import {
  buildDailyNutritionSummary,
  type NutritionRecommendationContextStore,
} from '$lib/features/nutrition/summary';
import {
  listFoodCatalogItems,
  listRecipeCatalogItems,
  type RecipeCatalogItemsStore,
} from '$lib/features/nutrition/store';
import {
  getNutritionPlannedMealResolution,
  resolveNutritionPlannedMeal,
  type NutritionPlannedMealResolution,
  type NutritionPlannedMealStore,
} from '$lib/features/nutrition/planned-meal-resolution';
import {
  listExerciseCatalogItems,
  listWorkoutTemplates,
  type MovementStorage,
} from '$lib/features/movement/service';
import { createSlotSummary } from '$lib/features/planning/model';
import { listPlanSlotsForDay } from '$lib/features/planning/service';
import {
  buildTodayIntelligence,
  buildTodayRecoveryAdaptation,
  type TodayIntelligenceResult,
  type TodayPlannedWorkoutInput as TodayPlannedWorkoutModel,
  type TodayRecoveryAdaptationInput as TodayRecoveryAdaptationModel,
} from '$lib/features/today/intelligence';

export type JournalEntriesStore = HealthDbJournalEntriesStore;

export interface TodaySnapshotStore
  extends
    NutritionRecommendationContextStore,
    NutritionPlannedMealStore,
    RecipeCatalogItemsStore,
    MovementStorage,
    JournalEntriesStore {}

export interface TodayPlanItem {
  id: string;
  title: string;
  subtitle: string;
  status: PlanSlot['status'];
}

export type TodayPlannedWorkout = TodayPlannedWorkoutModel;

export type TodayRecoveryAdaptation = TodayRecoveryAdaptationModel;

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
  recoveryAdaptation: TodayRecoveryAdaptation | null;
  intelligence: TodayIntelligenceResult;
  planItems: TodayPlanItem[];
  events: HealthEvent[];
  latestJournalEntry: JournalEntry | null;
}

export async function listEventsForDay(
  store: NutritionRecommendationContextStore,
  date: string
): Promise<HealthEvent[]> {
  return store.healthEvents.where('localDay').equals(date).sortBy('eventType');
}

async function getLatestJournalEntryForDay(
  store: JournalEntriesStore,
  date: string
): Promise<JournalEntry | null> {
  return (
    (await store.journalEntries.where('localDay').equals(date).sortBy('updatedAt')).at(-1) ?? null
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
  store: NutritionPlannedMealStore,
  date: string
): Promise<NutritionPlannedMealResolution> {
  return await getNutritionPlannedMealResolution(store, date);
}

export function buildTodaySnapshotFromData(input: {
  date: string;
  dailyRecord: DailyRecord | null;
  nutritionSummary: {
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
    entries: FoodEntry[];
  };
  planSlots: PlanSlot[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  workoutTemplates: import('$lib/core/domain/types').WorkoutTemplate[];
  exerciseCatalogItems: import('$lib/core/domain/types').ExerciseCatalogItem[];
  events: HealthEvent[];
  latestJournalEntry: JournalEntry | null;
}): TodaySnapshot {
  const {
    date,
    dailyRecord,
    nutritionSummary,
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
    events,
    latestJournalEntry,
  } = input;

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
  const recoveryAdaptation = buildTodayRecoveryAdaptation({
    dailyRecord,
    events,
    plannedMeal: plannedMealResolution.candidate?.meal ?? null,
    plannedWorkout,
    foodCatalogItems,
  });
  const intelligence = buildTodayIntelligence({
    date,
    dailyRecord,
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
    recoveryAdaptation,
    latestJournalEntry,
    events,
    planItemsCount: planItems.length,
  });

  return {
    date,
    dailyRecord,
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
    recoveryAdaptation,
    intelligence,
    planItems,
    events,
    latestJournalEntry,
  };
}

async function buildTodaySnapshotData(
  store: TodaySnapshotStore,
  date: string
): Promise<TodaySnapshot> {
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
    store.dailyRecords.where('date').equals(date).first(),
    buildDailyNutritionSummary(store, date),
    listPlanSlotsForDay(store, date),
    listFoodCatalogItems(store),
    listRecipeCatalogItems(store),
    listWorkoutTemplates(store),
    listExerciseCatalogItems(store),
    listEventsForDay(store, date),
    getLatestJournalEntryForDay(store, date),
  ]);

  return buildTodaySnapshotFromData({
    date,
    dailyRecord: dailyRecord ?? null,
    nutritionSummary,
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
    events,
    latestJournalEntry,
  });
}

export async function getTodaySnapshot(
  store: TodaySnapshotStore,
  date: string
): Promise<TodaySnapshot> {
  return await buildTodaySnapshotData(store, date);
}

export async function loadTodaySnapshotWithNotice(
  store: TodaySnapshotStore,
  date: string
): Promise<{ snapshot: TodaySnapshot; notice: string | null }> {
  return {
    snapshot: await buildTodaySnapshotData(store, date),
    notice: null,
  };
}
