import type {
  DailyRecord,
  ExerciseCatalogItem,
  FoodCatalogItem,
  FoodEntry,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  RecipeCatalogItem,
  WorkoutTemplate,
} from '$lib/core/domain/types';
import { buildDailyNutritionSummaryFromEntries } from '$lib/features/nutrition/summary';
import type { TodayPageState } from '$lib/features/today/controller';
import { createTodayFormFromSnapshot } from '$lib/features/today/model';
import { buildTodaySnapshotFromData, type TodaySnapshot } from '$lib/features/today/snapshot';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import { selectMirrorRecordsByField } from '$lib/server/db/drizzle/mirror';
import {
  listExerciseCatalogItemsServer,
  listFoodCatalogItemsServer,
  listPlanSlotsForDayServer,
  listRecipeCatalogItemsServer,
  listWorkoutTemplatesServer,
} from '$lib/server/planning/store';

export type TodaySourceData = {
  dailyRecord: DailyRecord | null;
  foodEntries: FoodEntry[];
  planSlots: PlanSlot[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
  events: HealthEvent[];
  latestJournalEntry: JournalEntry | null;
};

function sortTodayEvents(events: HealthEvent[]): HealthEvent[] {
  return [...events].sort((left, right) => left.eventType.localeCompare(right.eventType));
}

function latestJournalEntry(entries: JournalEntry[]): JournalEntry | null {
  return (
    [...entries].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1) ?? null
  );
}

function createLoadedTodayPageState(snapshot: TodaySnapshot, saveNotice = ''): TodayPageState {
  return {
    loading: false,
    saving: false,
    saveNotice,
    todayDate: snapshot.date,
    snapshot,
    form: createTodayFormFromSnapshot(snapshot),
  };
}

export async function loadTodaySourceData(localDay: string): Promise<TodaySourceData> {
  const { db } = getServerDrizzleClient();
  const [
    dailyRecords,
    foodEntries,
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
    events,
    journalEntries,
  ] = await Promise.all([
    selectMirrorRecordsByField<DailyRecord>(db, drizzleSchema.dailyRecords, 'date', localDay),
    selectMirrorRecordsByField<FoodEntry>(db, drizzleSchema.foodEntries, 'localDay', localDay),
    listPlanSlotsForDayServer(localDay),
    listFoodCatalogItemsServer(),
    listRecipeCatalogItemsServer(),
    listWorkoutTemplatesServer(),
    listExerciseCatalogItemsServer(),
    selectMirrorRecordsByField<HealthEvent>(db, drizzleSchema.healthEvents, 'localDay', localDay),
    selectMirrorRecordsByField<JournalEntry>(
      db,
      drizzleSchema.journalEntries,
      'localDay',
      localDay
    ),
  ]);

  return {
    dailyRecord: dailyRecords[0] ?? null,
    foodEntries: [...foodEntries].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    ),
    planSlots,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
    events: sortTodayEvents(events),
    latestJournalEntry: latestJournalEntry(journalEntries),
  };
}

export async function buildTodaySnapshotServer(localDay: string): Promise<TodaySnapshot> {
  const source = await loadTodaySourceData(localDay);
  return buildTodaySnapshotFromData({
    date: localDay,
    dailyRecord: source.dailyRecord,
    nutritionSummary: buildDailyNutritionSummaryFromEntries(source.foodEntries),
    planSlots: source.planSlots,
    foodCatalogItems: source.foodCatalogItems,
    recipeCatalogItems: source.recipeCatalogItems,
    workoutTemplates: source.workoutTemplates,
    exerciseCatalogItems: source.exerciseCatalogItems,
    events: source.events,
    latestJournalEntry: source.latestJournalEntry,
  });
}

export async function loadTodayPageServerWithNotice(
  localDay: string,
  saveNotice: string
): Promise<TodayPageState> {
  return createLoadedTodayPageState(await buildTodaySnapshotServer(localDay), saveNotice);
}

export async function loadTodayPageServer(localDay: string): Promise<TodayPageState> {
  return createLoadedTodayPageState(await buildTodaySnapshotServer(localDay));
}
