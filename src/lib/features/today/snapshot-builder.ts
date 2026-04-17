import type {
  DailyRecord,
  ExerciseCatalogItem,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  PlannedMeal,
  RecipeCatalogItem,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import { resolveNutritionPlannedMeal } from '$lib/features/nutrition/planned-meal-resolution';
import { createSlotSummary } from '$lib/features/planning/model';
import {
  buildTodayIntelligence,
  buildTodayRecoveryAdaptation,
  type TodayIntelligenceResult,
  type TodayPlannedWorkoutInput as TodayPlannedWorkoutModel,
  type TodayRecoveryAdaptationInput as TodayRecoveryAdaptationModel,
} from '$lib/features/today/intelligence';

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

function deriveTodayPlannedWorkout(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: RecipeCatalogItem[],
  workoutTemplates: WorkoutTemplate[],
  exerciseCatalogItems: ExerciseCatalogItem[]
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
  workoutTemplates: WorkoutTemplate[]
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

export function listStalePlannedWorkoutSlotIdsFromData(
  planSlots: PlanSlot[],
  workoutTemplates: WorkoutTemplate[]
): string[] {
  return planSlots
    .filter(
      (slot) =>
        slot.slotType === 'workout' &&
        slot.itemType === 'workout-template' &&
        slot.itemId &&
        slot.status === 'planned' &&
        !workoutTemplates.some((template) => template.id === slot.itemId)
    )
    .map((slot) => slot.id);
}

function createTodayPlanItems(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: RecipeCatalogItem[],
  workoutTemplates: WorkoutTemplate[],
  exerciseCatalogItems: ExerciseCatalogItem[]
): TodayPlanItem[] {
  return planSlots.map((slot) => ({
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
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
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

  const planItems = createTodayPlanItems(
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems
  );

  const plannedWorkout = deriveTodayPlannedWorkout(
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems
  );
  const plannedMealResolution = resolveNutritionPlannedMeal(
    planSlots,
    foodCatalogItems,
    recipeCatalogItems
  );
  const nutritionSummaryUnknown = {
    calories: nutritionSummary.entries.some((entry) => entry.calories === undefined),
    protein: nutritionSummary.entries.some((entry) => entry.protein === undefined),
    fiber: nutritionSummary.entries.some((entry) => entry.fiber === undefined),
    carbs: nutritionSummary.entries.some((entry) => entry.carbs === undefined),
    fat: nutritionSummary.entries.some((entry) => entry.fat === undefined),
  };
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
    nutritionSummaryUnknown,
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
