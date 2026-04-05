import { getHealthDb } from '$lib/core/db/client';
import { saveAssessmentProgress, submitAssessment } from '$lib/features/assessments/service';
import { deriveWeeklyGroceries, setGroceryItemState } from '$lib/features/groceries/service';
import { commitImportBatch, previewImport } from '$lib/features/imports/service';
import {
  createFoodEntry,
  saveFoodCatalogItem,
  upsertRecipeCatalogItem,
} from '$lib/features/nutrition/service';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { setSobrietyStatusForDay } from '$lib/features/sobriety/service';
import { saveDailyCheckin } from '$lib/features/today/service';
import { logAnxietyEvent } from '$lib/features/health/service';
import { HEALTHKIT_BUNDLE_JSON } from '../fixtures/healthkit-bundle';

export async function seedHealthkitImport() {
  const db = getHealthDb();
  const batch = await previewImport(db, {
    sourceType: 'healthkit-companion',
    rawText: HEALTHKIT_BUNDLE_JSON,
  });
  await commitImportBatch(db, batch.id);
}

export async function seedReviewSnapshotInputs() {
  const db = getHealthDb();
  await saveDailyCheckin(db, {
    date: '2026-03-31',
    mood: 3,
    energy: 2,
    stress: 3,
    focus: 3,
    sleepHours: 6,
    sleepQuality: 3,
  });
  await saveDailyCheckin(db, {
    date: '2026-04-02',
    mood: 5,
    energy: 4,
    stress: 2,
    focus: 4,
    sleepHours: 8,
    sleepQuality: 4,
  });
  await createFoodEntry(db, {
    localDay: '2026-03-31',
    mealType: 'breakfast',
    name: 'Oatmeal',
    calories: 320,
    protein: 25,
    fiber: 8,
  });
  await createFoodEntry(db, {
    localDay: '2026-04-02',
    mealType: 'breakfast',
    name: 'Protein breakfast',
    calories: 420,
    protein: 90,
    fiber: 7,
    carbs: 32,
    fat: 12,
  });
  await saveFoodCatalogItem(db, {
    name: 'Greek yogurt bowl',
    calories: 310,
    protein: 24,
    fiber: 6,
    carbs: 34,
    fat: 8,
  });
  await upsertRecipeCatalogItem(db, {
    id: 'themealdb:52772',
    createdAt: '2026-04-02T08:00:00.000Z',
    updatedAt: '2026-04-02T08:00:00.000Z',
    title: 'Teriyaki Chicken Casserole',
    sourceType: 'themealdb',
    sourceName: 'TheMealDB',
    externalId: '52772',
    mealType: 'dinner',
    cuisine: 'Japanese',
    ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
    instructions: 'Bake until cooked through.',
  });
  const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
  const mealSlot = await savePlanSlot(db, {
    weeklyPlanId: weeklyPlan.id,
    localDay: '2026-04-02',
    slotType: 'meal',
    itemType: 'recipe',
    itemId: 'themealdb:52772',
    title: 'Teriyaki Chicken Casserole',
  });
  await savePlanSlot(db, {
    weeklyPlanId: weeklyPlan.id,
    localDay: '2026-04-03',
    slotType: 'workout',
    itemType: 'freeform',
    title: 'Recovery walk',
  });
  await db.planSlots.put({
    ...mealSlot,
    status: 'done',
    updatedAt: '2026-04-02T10:00:00.000Z',
  });
  const groceries = await deriveWeeklyGroceries(db, weeklyPlan.id);
  if (groceries[0]) {
    await setGroceryItemState(db, groceries[0].id, {
      checked: true,
      excluded: false,
      onHand: false,
    });
  }
  if (groceries[1]) {
    await setGroceryItemState(db, groceries[1].id, {
      checked: false,
      excluded: true,
      onHand: true,
    });
  }
  await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
  await saveAssessmentProgress(db, {
    localDay: '2026-04-02',
    instrument: 'WHO-5',
    itemResponses: [3, 3, 3],
  });
  await logAnxietyEvent(db, {
    localDay: '2026-03-31',
    intensity: 4,
    trigger: 'Crowded store',
    durationMinutes: 20,
    note: 'Walked it off',
  });
  await seedHealthkitImport();
}

export async function seedAssessmentSafetyCase() {
  await submitAssessment(getHealthDb(), {
    localDay: '2026-04-02',
    instrument: 'PHQ-9',
    itemResponses: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  });
}
