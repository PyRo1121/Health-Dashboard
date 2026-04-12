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
import { updateRecordMeta } from '$lib/core/shared/records';
import { buildDailyNutritionSummaryFromEntries } from '$lib/features/nutrition/summary';
import { buildFoodEntryRecord } from '$lib/features/nutrition/store';
import { resolveNutritionPlannedMeal } from '$lib/features/nutrition/planned-meal-resolution';
import { CHECKIN_EVENT_FIELDS, buildDailyCheckinEvent } from '$lib/features/today/actions';
import { createDailyCheckinPayload, createTodayFormFromSnapshot } from '$lib/features/today/model';
import { buildTodaySnapshotFromData, type TodaySnapshot } from '$lib/features/today/snapshot';
import type { TodayPageState } from '$lib/features/today/controller';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import {
  deletePlanSlotServer,
  ensureWeeklyPlanServer,
  listExerciseCatalogItemsServer,
  listFoodCatalogItemsServer,
  listPlanSlotsForDayServer,
  listRecipeCatalogItemsServer,
  listWorkoutTemplatesServer,
  savePlanSlotServer,
  updatePlanSlotServer,
} from '$lib/server/planning/store';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
  upsertMirrorRecords,
} from '$lib/server/db/drizzle/mirror';

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

async function loadTodaySourceData(localDay: string): Promise<{
  dailyRecord: DailyRecord | null;
  foodEntries: FoodEntry[];
  planSlots: PlanSlot[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
  events: HealthEvent[];
  latestJournalEntry: JournalEntry | null;
}> {
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

async function buildTodaySnapshotServer(localDay: string): Promise<TodaySnapshot> {
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

async function upsertDailyRecordServer(
  input: ReturnType<typeof createDailyCheckinPayload>
): Promise<DailyRecord> {
  const { db } = getServerDrizzleClient();
  const existing = (
    await selectMirrorRecordsByField<DailyRecord>(
      db,
      drizzleSchema.dailyRecords,
      'date',
      input.date
    )
  )[0];
  const timestamp = new Date().toISOString();
  const record: DailyRecord = {
    ...existing,
    ...updateRecordMeta(existing, `daily:${input.date}`, timestamp),
    date: input.date,
    mood: input.mood,
    energy: input.energy,
    stress: input.stress,
    focus: input.focus,
    sleepHours: input.sleepHours,
    sleepQuality: input.sleepQuality,
    freeformNote: input.freeformNote,
  };
  await upsertMirrorRecord(db, 'dailyRecords', drizzleSchema.dailyRecords, record);
  return record;
}

async function saveDailyCheckinEventsServer(
  input: ReturnType<typeof createDailyCheckinPayload>
): Promise<void> {
  const { db } = getServerDrizzleClient();
  const timestamp = new Date().toISOString();
  const events = CHECKIN_EVENT_FIELDS.map((eventType) =>
    buildDailyCheckinEvent(input.date, eventType, input[eventType], timestamp)
  );
  await upsertMirrorRecords(db, 'healthEvents', drizzleSchema.healthEvents, events);
}

async function loadTodayPageServerWithNotice(
  localDay: string,
  saveNotice: string
): Promise<TodayPageState> {
  return createLoadedTodayPageState(await buildTodaySnapshotServer(localDay), saveNotice);
}

export async function loadTodayPageServer(localDay: string): Promise<TodayPageState> {
  return createLoadedTodayPageState(await buildTodaySnapshotServer(localDay));
}

export async function saveTodayPageServer(state: TodayPageState): Promise<TodayPageState> {
  const payload = createDailyCheckinPayload(state.todayDate, state.form);
  await upsertDailyRecordServer(payload);
  await saveDailyCheckinEventsServer(payload);
  await refreshWeeklyReviewArtifactsServer(state.todayDate);
  return await loadTodayPageServerWithNotice(state.todayDate, 'Saved for today.');
}

export async function logTodayPlannedMealPageServer(
  state: TodayPageState
): Promise<TodayPageState> {
  const source = await loadTodaySourceData(state.todayDate);
  const resolution = resolveNutritionPlannedMeal(source.planSlots, source.foodCatalogItems);
  if (!resolution.candidate) {
    return await loadTodayPageServerWithNotice(state.todayDate, 'No planned meal to log.');
  }

  const { db } = getServerDrizzleClient();
  await upsertMirrorRecord(
    db,
    'foodEntries',
    drizzleSchema.foodEntries,
    buildFoodEntryRecord({
      localDay: state.todayDate,
      mealType: resolution.candidate.meal.mealType,
      name: resolution.candidate.meal.name,
      calories: resolution.candidate.meal.calories,
      protein: resolution.candidate.meal.protein,
      fiber: resolution.candidate.meal.fiber,
      carbs: resolution.candidate.meal.carbs,
      fat: resolution.candidate.meal.fat,
      sourceName: resolution.candidate.meal.sourceName,
      notes: resolution.candidate.meal.notes,
    })
  );

  if (resolution.candidate.slotId) {
    const slot = source.planSlots.find(
      (candidate) => candidate.id === resolution.candidate?.slotId
    );
    if (slot) {
      await updatePlanSlotServer(slot.id, { status: 'done' });
    }
  }

  await refreshWeeklyReviewArtifactsServer(state.todayDate);
  return await loadTodayPageServerWithNotice(state.todayDate, 'Planned meal logged.');
}

export async function clearTodayPlannedMealPageServer(
  state: TodayPageState
): Promise<TodayPageState> {
  const source = await loadTodaySourceData(state.todayDate);
  const resolution = resolveNutritionPlannedMeal(source.planSlots, source.foodCatalogItems);
  if (resolution.candidate?.slotId) {
    const slot = source.planSlots.find(
      (candidate) => candidate.id === resolution.candidate?.slotId
    );
    if (slot) {
      await deletePlanSlotServer(slot.id);
      await refreshWeeklyReviewArtifactsServer(state.todayDate);
    }
  }

  return await loadTodayPageServerWithNotice(state.todayDate, 'Planned meal cleared.');
}

export async function markTodayPlanSlotStatusPageServer(
  state: TodayPageState,
  slotId: string,
  status: PlanSlot['status']
): Promise<TodayPageState> {
  const { db } = getServerDrizzleClient();
  const slot = await selectMirrorRecordById<PlanSlot>(db, drizzleSchema.planSlots, slotId);
  if (slot) {
    await updatePlanSlotServer(slot.id, { status });
    await refreshWeeklyReviewArtifactsServer(slot.localDay);
    return await loadTodayPageServerWithNotice(slot.localDay, `Plan item marked ${status}.`);
  }

  return await loadTodayPageServerWithNotice(state.todayDate, `Plan item marked ${status}.`);
}

export async function applyTodayRecoveryActionPageServer(
  state: TodayPageState,
  actionId: 'apply-recovery-meal' | 'apply-recovery-workout'
): Promise<TodayPageState> {
  const snapshot = await buildTodaySnapshotServer(state.todayDate);
  const source = await loadTodaySourceData(state.todayDate);
  const adaptation = snapshot.recoveryAdaptation;
  if (!adaptation) {
    return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery action unavailable.');
  }

  if (actionId === 'apply-recovery-meal') {
    const recommendation = adaptation.mealRecommendation;
    if (!recommendation) {
      return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery action unavailable.');
    }

    const food = source.foodCatalogItems.find((item) => item.name === recommendation.title);
    if (!food) {
      return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery action unavailable.');
    }

    const currentMealSlot = source.planSlots.find(
      (slot) => slot.slotType === 'meal' && slot.status === 'planned'
    );

    if (currentMealSlot) {
      await updatePlanSlotServer(currentMealSlot.id, {
        itemType: 'food',
        itemId: food.id,
        mealType: currentMealSlot.mealType ?? snapshot.plannedMeal?.mealType ?? 'meal',
        title: food.name,
      });
    } else {
      const weeklyPlan = await ensureWeeklyPlanServer(state.todayDate);
      await savePlanSlotServer({
        weeklyPlanId: weeklyPlan.id,
        localDay: state.todayDate,
        slotType: 'meal',
        itemType: 'food',
        itemId: food.id,
        mealType: snapshot.plannedMeal?.mealType ?? 'meal',
        title: food.name,
      });
    }

    await refreshWeeklyReviewArtifactsServer(state.todayDate);
    return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery meal applied.');
  }

  const currentWorkoutSlot = source.planSlots.find(
    (slot) => slot.slotType === 'workout' && slot.status === 'planned'
  );
  if (!currentWorkoutSlot) {
    return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery action unavailable.');
  }

  await updatePlanSlotServer(currentWorkoutSlot.id, {
    itemType: 'freeform',
    itemId: undefined,
    title: 'Recovery walk',
    notes: '10-20 minutes easy walk or mobility reset.',
  });
  await refreshWeeklyReviewArtifactsServer(state.todayDate);
  return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery workout applied.');
}
