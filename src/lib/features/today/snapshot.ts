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

export interface TodayRecoveryAdaptation {
  level: 'lighter-day' | 'recovery';
  headline: string;
  reasons: string[];
  mealFallback: string[];
  workoutFallback: string[];
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
  recoveryAdaptation: TodayRecoveryAdaptation | null;
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

function summarizeRecoveryReasons(
  dailyRecord: DailyRecord | null,
  events: HealthEvent[]
): { level: TodayRecoveryAdaptation['level']; reasons: string[] } | null {
  const recoveryReasons = new Set<string>();
  const lighterReasons = new Set<string>();

  const sleepHours = dailyRecord?.sleepHours;
  if (typeof sleepHours === 'number') {
    if (sleepHours < 6) {
      recoveryReasons.add('Sleep landed under 6 hours.');
    } else if (sleepHours < 7) {
      lighterReasons.add('Sleep landed under 7 hours.');
    }
  }

  const sleepQuality = dailyRecord?.sleepQuality;
  if (typeof sleepQuality === 'number') {
    if (sleepQuality <= 2) {
      recoveryReasons.add('Sleep quality is dragging today.');
    } else if (sleepQuality <= 3) {
      lighterReasons.add('Sleep quality is softer than usual today.');
    }
  }

  for (const event of events) {
    if (event.eventType === 'symptom') {
      const severity =
        typeof event.payload?.severity === 'number'
          ? event.payload.severity
          : typeof event.value === 'number'
            ? event.value
            : null;
      if (severity !== null) {
        if (severity >= 4) {
          recoveryReasons.add('Symptom load is elevated today.');
        } else if (severity >= 3) {
          lighterReasons.add('Symptoms are present enough to simplify the day.');
        }
      }
    }

    if (event.eventType === 'anxiety-episode') {
      const intensity =
        typeof event.payload?.intensity === 'number'
          ? event.payload.intensity
          : typeof event.value === 'number'
            ? event.value
            : null;
      if (intensity !== null) {
        if (intensity >= 7) {
          recoveryReasons.add('Anxiety intensity spiked today.');
        } else if (intensity >= 5) {
          lighterReasons.add('Anxiety is elevated enough to lower friction.');
        }
      }
    }
  }

  if (recoveryReasons.size) {
    return {
      level: 'recovery',
      reasons: [...recoveryReasons],
    };
  }

  if (lighterReasons.size) {
    return {
      level: 'lighter-day',
      reasons: [...lighterReasons],
    };
  }

  return null;
}

function buildRecoveryMealFallback(
  plannedMeal: TodaySnapshot['plannedMeal'],
  level: TodayRecoveryAdaptation['level']
): string[] {
  if (plannedMeal) {
    return [
      level === 'recovery'
        ? 'Meal fallback: keep the next meal familiar, easy, and protein-forward.'
        : `Meal fallback: keep ${plannedMeal.name} simple and skip any extra decision-making.`,
    ];
  }

  return [
    level === 'recovery'
      ? 'Meal fallback: repeat one easy meal you already trust instead of improvising.'
      : 'Meal fallback: pick one familiar meal and keep the rest of the day light.',
  ];
}

function buildRecoveryWorkoutFallback(
  plannedWorkout: TodayPlannedWorkout | null,
  level: TodayRecoveryAdaptation['level']
): string[] {
  if (plannedWorkout) {
    return [
      level === 'recovery'
        ? `Workout fallback: downgrade ${plannedWorkout.title} to a short walk, mobility reset, or full rest.`
        : `Workout fallback: trim ${plannedWorkout.title} to the first block or swap to easy movement.`,
    ];
  }

  return [
    level === 'recovery'
      ? 'Workout fallback: skip intensity today and protect recovery.'
      : 'Workout fallback: keep movement gentle with a walk, mobility, or a short reset.',
  ];
}

function deriveTodayRecoveryAdaptation(
  dailyRecord: DailyRecord | null,
  events: HealthEvent[],
  plannedMeal: TodaySnapshot['plannedMeal'],
  plannedWorkout: TodayPlannedWorkout | null
): TodayRecoveryAdaptation | null {
  const recoverySummary = summarizeRecoveryReasons(dailyRecord, events);
  if (!recoverySummary) {
    return null;
  }

  return {
    level: recoverySummary.level,
    headline:
      recoverySummary.level === 'recovery'
        ? 'Recovery mode: simplify the day.'
        : 'Lighter day: reduce friction, not momentum.',
    reasons: recoverySummary.reasons,
    mealFallback: buildRecoveryMealFallback(plannedMeal, recoverySummary.level),
    workoutFallback: buildRecoveryWorkoutFallback(plannedWorkout, recoverySummary.level),
  };
}

export async function getTodayPlannedMealResolution(
  db: HealthDatabase,
  date: string
): Promise<NutritionPlannedMealResolution> {
  return await getNutritionPlannedMealResolution(db, date);
}

async function buildTodaySnapshotData(db: HealthDatabase, date: string): Promise<TodaySnapshot> {
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
  const recoveryAdaptation = deriveTodayRecoveryAdaptation(
    dailyRecord ?? null,
    events,
    plannedMealResolution.candidate?.meal ?? null,
    plannedWorkout
  );

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
    recoveryAdaptation,
    planItems,
    events,
    latestJournalEntry,
  };
}

export async function getTodaySnapshot(db: HealthDatabase, date: string): Promise<TodaySnapshot> {
  return await buildTodaySnapshotData(db, date);
}

export async function loadTodaySnapshotWithNotice(
  db: HealthDatabase,
  date: string
): Promise<{ snapshot: TodaySnapshot; notice: string | null }> {
  return {
    snapshot: await buildTodaySnapshotData(db, date),
    notice: null,
  };
}
