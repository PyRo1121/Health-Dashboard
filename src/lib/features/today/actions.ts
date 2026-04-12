import { nowIso } from '$lib/core/domain/time';
import type { DailyRecord, FoodEntry, HealthEvent, PlanSlot } from '$lib/core/domain/types';
import { upsertDailyRecord, type DailyRecordsStore } from '$lib/core/shared/daily-records';
import { createRecordMeta } from '$lib/core/shared/records';
import {
  createFoodEntry,
  listFoodCatalogItems,
  type FoodCatalogItemsStore,
  type FoodEntriesStore,
} from '$lib/features/nutrition/store';
import {
  deletePlanSlot,
  ensureWeeklyPlan,
  listPlanSlotsForDay,
  savePlanSlot,
  updatePlanSlot,
  updatePlanSlotStatus,
  type PlanSlotsStore,
  type WeeklyPlansStore,
} from '$lib/features/planning/service';
import {
  refreshWeeklyReviewArtifactsSafely,
  type ReviewStorage,
} from '$lib/features/review/service';
import {
  getTodayPlannedMealResolution,
  getTodaySnapshot,
  type TodaySnapshotStore,
} from './snapshot';

export interface TodayActionsStorage
  extends
    TodaySnapshotStore,
    DailyRecordsStore,
    FoodEntriesStore,
    FoodCatalogItemsStore,
    PlanSlotsStore,
    WeeklyPlansStore,
    ReviewStorage {}

export interface DailyCheckinInput {
  date: string;
  mood: number;
  energy: number;
  stress: number;
  focus: number;
  sleepHours: number;
  sleepQuality: number;
  freeformNote?: string;
}

export const CHECKIN_EVENT_FIELDS = [
  'mood',
  'energy',
  'stress',
  'focus',
  'sleepHours',
  'sleepQuality',
] as const satisfies ReadonlyArray<
  keyof Pick<
    DailyCheckinInput,
    'mood' | 'energy' | 'stress' | 'focus' | 'sleepHours' | 'sleepQuality'
  >
>;

export function buildDailyCheckinEvent(
  localDay: string,
  eventType: string,
  value: number,
  timestamp: string
): HealthEvent {
  return {
    ...createRecordMeta(`manual:${localDay}:${eventType}`, timestamp),
    sourceType: 'manual',
    sourceApp: 'personal-health-cockpit',
    sourceRecordId: `daily:${localDay}:${eventType}`,
    sourceTimestamp: timestamp,
    localDay,
    timezone: 'UTC',
    confidence: 1,
    eventType,
    value,
  };
}

export async function saveDailyCheckin(
  store: TodayActionsStorage,
  input: DailyCheckinInput
): Promise<DailyRecord> {
  const timestamp = nowIso();
  const record = await upsertDailyRecord(store, input.date, {
    mood: input.mood,
    energy: input.energy,
    stress: input.stress,
    focus: input.focus,
    sleepHours: input.sleepHours,
    sleepQuality: input.sleepQuality,
    freeformNote: input.freeformNote,
  });

  await Promise.all(
    CHECKIN_EVENT_FIELDS.map((eventType) =>
      store.healthEvents.put(
        buildDailyCheckinEvent(input.date, eventType, input[eventType], timestamp)
      )
    )
  );
  await refreshWeeklyReviewArtifactsSafely(store, input.date);

  return record;
}

export async function logPlannedMealForToday(
  store: TodayActionsStorage,
  date: string
): Promise<FoodEntry | null> {
  const resolution = await getTodayPlannedMealResolution(store, date);
  if (!resolution.candidate) {
    return null;
  }

  const candidate = resolution.candidate;
  const entry = await createFoodEntry(store, {
    localDay: date,
    mealType: candidate.meal.mealType,
    name: candidate.meal.name,
    calories: candidate.meal.calories,
    protein: candidate.meal.protein,
    fiber: candidate.meal.fiber,
    carbs: candidate.meal.carbs,
    fat: candidate.meal.fat,
    sourceName: candidate.meal.sourceName,
    notes: candidate.meal.notes,
  });

  if (candidate.slotId) {
    await updatePlanSlotStatus(store, candidate.slotId, 'done');
  }
  await refreshWeeklyReviewArtifactsSafely(store, date);

  return entry;
}

export async function clearTodayPlannedMeal(
  store: TodayActionsStorage,
  date: string
): Promise<void> {
  const resolution = await getTodayPlannedMealResolution(store, date);
  if (resolution.candidate?.slotId) {
    await deletePlanSlot(store, resolution.candidate.slotId);
    await refreshWeeklyReviewArtifactsSafely(store, date);
  }
}

export async function updateTodayPlanSlotStatus(
  store: TodayActionsStorage,
  slotId: string,
  status: PlanSlot['status']
): Promise<PlanSlot> {
  const slot = await updatePlanSlotStatus(store, slotId, status);
  await refreshWeeklyReviewArtifactsSafely(store, slot.localDay);
  return slot;
}

export async function applyTodayRecoveryAction(
  store: TodayActionsStorage,
  date: string,
  actionId: 'apply-recovery-meal' | 'apply-recovery-workout'
): Promise<boolean> {
  const snapshot = await getTodaySnapshot(store, date);
  const adaptation = snapshot.recoveryAdaptation;
  if (!adaptation) {
    return false;
  }

  if (actionId === 'apply-recovery-meal') {
    const recommendation = adaptation.mealRecommendation;
    if (!recommendation) {
      return false;
    }

    const food = (await listFoodCatalogItems(store)).find(
      (item) => item.name === recommendation.title
    );
    if (!food) {
      return false;
    }

    const currentMealSlot = (await listPlanSlotsForDay(store, date)).find(
      (slot) => slot.slotType === 'meal' && slot.status === 'planned'
    );

    if (currentMealSlot) {
      await updatePlanSlot(store, currentMealSlot.id, {
        itemType: 'food',
        itemId: food.id,
        mealType: currentMealSlot.mealType ?? snapshot.plannedMeal?.mealType ?? 'meal',
        title: food.name,
      });
    } else {
      const weeklyPlan = await ensureWeeklyPlan(store, date);
      await savePlanSlot(store, {
        weeklyPlanId: weeklyPlan.id,
        localDay: date,
        slotType: 'meal',
        itemType: 'food',
        itemId: food.id,
        mealType: snapshot.plannedMeal?.mealType ?? 'meal',
        title: food.name,
      });
    }

    await refreshWeeklyReviewArtifactsSafely(store, date);
    return true;
  }

  const currentWorkoutSlot = (await listPlanSlotsForDay(store, date)).find(
    (slot) => slot.slotType === 'workout' && slot.status === 'planned'
  );
  if (!currentWorkoutSlot) {
    return false;
  }

  await updatePlanSlot(store, currentWorkoutSlot.id, {
    itemType: 'freeform',
    itemId: undefined,
    title: 'Recovery walk',
    notes: '10-20 minutes easy walk or mobility reset.',
  });
  await refreshWeeklyReviewArtifactsSafely(store, date);
  return true;
}
