import type { DailyRecord, PlanSlot } from '$lib/core/domain/types';
import { updateRecordMeta } from '$lib/core/shared/records';
import { buildFoodEntryRecord } from '$lib/features/nutrition/store';
import {
  listStalePlannedMealSlotIdsFromData,
  resolveNutritionPlannedMeal,
} from '$lib/features/nutrition/planned-meal-resolution';
import { CHECKIN_EVENT_FIELDS, buildDailyCheckinEvent } from '$lib/features/today/actions';
import { createDailyCheckinPayload } from '$lib/features/today/model';
import { listStalePlannedWorkoutSlotIdsFromData } from '$lib/features/today/snapshot-builder';
import type { TodayPageState } from '$lib/features/today/controller';
import { getServerDrizzleClient } from '$lib/server/db/drizzle/client';
import { drizzleSchema } from '$lib/server/db/drizzle/schema';
import {
  selectMirrorRecordById,
  selectMirrorRecordsByField,
  upsertMirrorRecord,
  upsertMirrorRecords,
} from '$lib/server/db/drizzle/mirror';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import {
  loadTodayPageServerWithNotice,
  loadTodaySourceData,
  buildTodaySnapshotServer,
} from '$lib/server/today/page-loader';
import {
  deletePlanSlotServer,
  ensureWeeklyPlanServer,
  listFoodCatalogItemsServer,
  listPlanSlotsForDayServer,
  listRecipeCatalogItemsServer,
  listWorkoutTemplatesServer,
  savePlanSlotServer,
  updatePlanSlotServer,
} from '$lib/server/planning/store';

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

async function deleteStalePlannedWorkoutSlotsServer(localDay: string): Promise<boolean> {
  const [planSlots, workoutTemplates] = await Promise.all([
    listPlanSlotsForDayServer(localDay),
    listWorkoutTemplatesServer(),
  ]);
  const staleSlotIds = listStalePlannedWorkoutSlotIdsFromData(planSlots, workoutTemplates);
  for (const slotId of staleSlotIds) {
    await deletePlanSlotServer(slotId);
  }
  return staleSlotIds.length > 0;
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
  const resolution = resolveNutritionPlannedMeal(
    source.planSlots,
    source.foodCatalogItems,
    source.recipeCatalogItems
  );
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

  const staleSlotIds = listStalePlannedMealSlotIdsFromData(
    source.planSlots,
    source.foodCatalogItems,
    source.recipeCatalogItems
  );
  for (const slotId of staleSlotIds) {
    await deletePlanSlotServer(slotId);
  }

  await refreshWeeklyReviewArtifactsServer(state.todayDate);
  return await loadTodayPageServerWithNotice(state.todayDate, 'Planned meal logged.');
}

export async function clearTodayPlannedMealPageServer(
  state: TodayPageState
): Promise<TodayPageState> {
  const source = await loadTodaySourceData(state.todayDate);
  const resolution = resolveNutritionPlannedMeal(
    source.planSlots,
    source.foodCatalogItems,
    source.recipeCatalogItems
  );
  let changed = false;

  if (resolution.candidate?.slotId) {
    const slot = source.planSlots.find(
      (candidate) => candidate.id === resolution.candidate?.slotId
    );
    if (slot) {
      await deletePlanSlotServer(slot.id);
      changed = true;
    }
  }

  const staleSlotIds = listStalePlannedMealSlotIdsFromData(
    source.planSlots,
    source.foodCatalogItems,
    source.recipeCatalogItems
  );
  for (const slotId of staleSlotIds) {
    await deletePlanSlotServer(slotId);
    changed = true;
  }

  if (changed) {
    await refreshWeeklyReviewArtifactsServer(state.todayDate);
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
    if (slot.slotType === 'meal') {
      const [planSlots, foodCatalogItems] = await Promise.all([
        listPlanSlotsForDayServer(slot.localDay),
        listFoodCatalogItemsServer(),
      ]);
      const staleMealSlotIds = listStalePlannedMealSlotIdsFromData(
        planSlots,
        foodCatalogItems,
        await listRecipeCatalogItemsServer()
      );
      for (const staleSlotId of staleMealSlotIds) {
        await deletePlanSlotServer(staleSlotId);
      }
    }
    if (slot.slotType === 'workout') {
      await deleteStalePlannedWorkoutSlotsServer(slot.localDay);
    }
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

    const plannedMealResolution = resolveNutritionPlannedMeal(
      source.planSlots,
      source.foodCatalogItems,
      source.recipeCatalogItems
    );
    const currentMealSlot = plannedMealResolution.candidate?.slotId
      ? source.planSlots.find((slot) => slot.id === plannedMealResolution.candidate?.slotId)
      : source.planSlots.find((slot) => slot.slotType === 'meal' && slot.status === 'planned');

    if (currentMealSlot) {
      await updatePlanSlotServer(currentMealSlot.id, {
        itemType: 'food',
        itemId: food.id,
        mealType: currentMealSlot.mealType ?? snapshot.plannedMeal?.mealType ?? 'meal',
        title: food.name,
        notes: undefined,
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

    const staleSlotIds = listStalePlannedMealSlotIdsFromData(
      source.planSlots,
      source.foodCatalogItems,
      source.recipeCatalogItems
    );
    for (const slotId of staleSlotIds) {
      await deletePlanSlotServer(slotId);
    }

    await refreshWeeklyReviewArtifactsServer(state.todayDate);
    return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery meal applied.');
  }

  const currentWorkoutSlot = snapshot.plannedWorkout
    ? source.planSlots.find((slot) => slot.id === snapshot.plannedWorkout?.id)
    : source.planSlots.find((slot) => slot.slotType === 'workout' && slot.status === 'planned');
  if (!currentWorkoutSlot) {
    return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery action unavailable.');
  }

  await updatePlanSlotServer(currentWorkoutSlot.id, {
    itemType: 'freeform',
    itemId: undefined,
    title: 'Recovery walk',
    notes: '10-20 minutes easy walk or mobility reset.',
  });
  await deleteStalePlannedWorkoutSlotsServer(state.todayDate);
  await refreshWeeklyReviewArtifactsServer(state.todayDate);
  return await loadTodayPageServerWithNotice(state.todayDate, 'Recovery workout applied.');
}
