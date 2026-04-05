import type { HealthDatabase } from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type { FoodEntry, HealthEvent, PlanSlot } from '$lib/core/domain/types';
import { upsertDailyRecord } from '$lib/core/shared/daily-records';
import { createRecordMeta } from '$lib/core/shared/records';
import { createFoodEntry } from '$lib/features/nutrition/service';
import { deletePlanSlot, updatePlanSlotStatus } from '$lib/features/planning/service';
import { refreshWeeklyReviewArtifacts } from '$lib/features/review/service';
import { getTodayPlannedMealResolution } from './snapshot';

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

const CHECKIN_EVENT_FIELDS = [
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

function buildEvent(
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
  db: HealthDatabase,
  input: DailyCheckinInput
): Promise<import('$lib/core/domain/types').DailyRecord> {
  const timestamp = nowIso();
  const record = await upsertDailyRecord(db, input.date, {
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
      db.healthEvents.put(buildEvent(input.date, eventType, input[eventType], timestamp))
    )
  );
  await refreshWeeklyReviewArtifacts(db, input.date);

  return record;
}

export async function logPlannedMealForToday(
  db: HealthDatabase,
  date: string
): Promise<FoodEntry | null> {
  const resolution = await getTodayPlannedMealResolution(db, date);
  if (!resolution.candidate) {
    return null;
  }

  const candidate = resolution.candidate;
  const entry = await createFoodEntry(db, {
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
    await updatePlanSlotStatus(db, candidate.slotId, 'done');
  }
  await refreshWeeklyReviewArtifacts(db, date).catch(() => undefined);

  return entry;
}

export async function clearTodayPlannedMeal(db: HealthDatabase, date: string): Promise<void> {
  const resolution = await getTodayPlannedMealResolution(db, date);
  if (resolution.candidate?.slotId) {
    await deletePlanSlot(db, resolution.candidate.slotId);
    await refreshWeeklyReviewArtifacts(db, date);
  }
}

export async function updateTodayPlanSlotStatus(
  db: HealthDatabase,
  slotId: string,
  status: PlanSlot['status']
): Promise<PlanSlot> {
  const slot = await updatePlanSlotStatus(db, slotId, status);
  await refreshWeeklyReviewArtifacts(db, slot.localDay);
  return slot;
}
