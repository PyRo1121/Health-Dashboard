import type { HealthDbJournalEntriesStore } from '$lib/core/db/types';
import type { HealthEvent, JournalEntry } from '$lib/core/domain/types';
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
  type NutritionPlannedMealResolution,
  type NutritionPlannedMealStore,
} from '$lib/features/nutrition/planned-meal-resolution';
import {
  listExerciseCatalogItems,
  listWorkoutTemplates,
  type MovementStorage,
} from '$lib/features/movement/service';
import { listPlanSlotsForDay } from '$lib/features/planning/service';
import { buildTodaySnapshotFromData, type TodaySnapshot } from './snapshot-builder';

export type {
  TodayPlanItem,
  TodayPlannedWorkout,
  TodayRecoveryAdaptation,
  TodaySnapshot,
} from './snapshot-builder';
export { buildTodaySnapshotFromData } from './snapshot-builder';

export type JournalEntriesStore = HealthDbJournalEntriesStore;

export interface TodaySnapshotStore
  extends
    NutritionRecommendationContextStore,
    NutritionPlannedMealStore,
    RecipeCatalogItemsStore,
    MovementStorage,
    JournalEntriesStore {}

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

export async function getTodayPlannedMealResolution(
  store: NutritionPlannedMealStore,
  date: string
): Promise<NutritionPlannedMealResolution> {
  return await getNutritionPlannedMealResolution(store, date);
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
