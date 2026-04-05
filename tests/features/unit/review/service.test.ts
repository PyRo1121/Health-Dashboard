import { describe, expect, it } from 'vitest';
import { saveAssessmentProgress, submitAssessment } from '$lib/features/assessments/service';
import { deriveWeeklyGroceries, setGroceryItemState } from '$lib/features/groceries/service';
import { commitImportBatch, previewImport } from '$lib/features/imports/service';
import { saveFoodCatalogItem, upsertRecipeCatalogItem } from '$lib/features/nutrition/service';
import {
  ensureWeeklyPlan,
  savePlanSlot,
  updatePlanSlotStatus,
} from '$lib/features/planning/service';
import {
  buildWeeklySnapshot,
  computeCorrelations,
  computeTrendComparisons,
  refreshWeeklyReviewArtifacts,
  saveNextWeekExperiment,
} from '$lib/features/review/service';
import { setSobrietyStatusForDay } from '$lib/features/sobriety/service';
import { createFoodEntry } from '$lib/features/nutrition/service';
import { saveDailyCheckin } from '$lib/features/today/service';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('review service', () => {
  const getDb = useTestHealthDb('review-service');

  async function seedWeek() {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-03-30',
      mood: 3,
      energy: 2,
      stress: 3,
      focus: 3,
      sleepHours: 6,
      sleepQuality: 3,
    });
    await createFoodEntry(db, {
      localDay: '2026-03-30',
      mealType: 'breakfast',
      name: 'Low protein breakfast',
      calories: 250,
      protein: 25,
      fiber: 6,
    });

    await saveDailyCheckin(db, {
      date: '2026-04-01',
      mood: 5,
      energy: 4,
      stress: 2,
      focus: 4,
      sleepHours: 8,
      sleepQuality: 4,
    });
    await createFoodEntry(db, {
      localDay: '2026-04-01',
      mealType: 'breakfast',
      name: 'Higher protein breakfast',
      calories: 420,
      protein: 95,
      fiber: 9,
    });

    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 4,
      energy: 4,
      stress: 2,
      focus: 4,
      sleepHours: 7.5,
      sleepQuality: 4,
    });
    await createFoodEntry(db, {
      localDay: '2026-04-02',
      mealType: 'lunch',
      name: 'Chicken salad',
      calories: 410,
      protein: 88,
      fiber: 7,
    });
    await setSobrietyStatusForDay(db, { localDay: '2026-04-01', status: 'sober' });
    await setSobrietyStatusForDay(db, { localDay: '2026-04-02', status: 'sober' });
    await submitAssessment(db, {
      localDay: '2026-04-02',
      instrument: 'WHO-5',
      itemResponses: [3, 3, 3, 4, 4],
    });
    const batch = await previewImport(db, {
      sourceType: 'healthkit-companion',
      rawText: HEALTHKIT_BUNDLE_JSON,
    });
    await commitImportBatch(db, batch.id);
  }

  it('computes weekly trend comparisons', async () => {
    const db = getDb();
    await seedWeek();
    const trends = await computeTrendComparisons(db, '2026-04-02');
    expect(trends.weekStart).toBe('2026-03-30');
    expect(trends.daysTracked).toBe(3);
    expect(trends.averageMood).toBeGreaterThan(3);
    expect(trends.averageProtein).toBeGreaterThan(60);
  });

  it('derives explainable correlations from sleep and protein', async () => {
    const db = getDb();
    await seedWeek();
    const records = await db.dailyRecords.toArray();
    const foods = await db.foodEntries.toArray();
    const correlations = computeCorrelations(records, foods);
    expect(correlations.some((item) => item.label.includes('Higher sleep'))).toBe(true);
    expect(correlations.some((item) => item.label.includes('Higher protein'))).toBe(true);
  });

  it('builds a weekly snapshot with flags and experiment options', async () => {
    const db = getDb();
    await seedWeek();
    const weekly = await buildWeeklySnapshot(db, '2026-04-02');
    expect(weekly.snapshot.headline).toBeTruthy();
    expect(weekly.snapshot.daysTracked).toBe(3);
    expect(weekly.experimentOptions).toHaveLength(3);
    expect(weekly.assessmentSummary[0]).toContain('WHO-5');
    expect(weekly.deviceHighlights.some((line) => line.includes('Sleep'))).toBe(true);
  });

  it('threads adherence scores and grocery signals through the weekly snapshot', async () => {
    const db = getDb();
    await seedWeek();
    await upsertRecipeCatalogItem(db, {
      id: 'themealdb:52772',
      createdAt: '2026-03-30T08:00:00.000Z',
      updatedAt: '2026-03-30T08:00:00.000Z',
      title: 'Teriyaki Chicken Casserole',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52772',
      mealType: 'dinner',
      ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
    });

    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const completedMeal = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: 'food-1',
      title: 'Greek yogurt bowl',
    });
    const skippedRecipe = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-03',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });
    const completedWorkout = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-03',
      slotType: 'workout',
      itemType: 'freeform',
      title: 'Full body reset',
    });

    await updatePlanSlotStatus(db, completedMeal.id, 'done');
    await updatePlanSlotStatus(db, skippedRecipe.id, 'skipped');
    await updatePlanSlotStatus(db, completedWorkout.id, 'done');

    const groceries = await deriveWeeklyGroceries(db, weeklyPlan.id);
    if (!groceries[0]) {
      throw new Error('Expected derived groceries for the skipped recipe slot');
    }
    await setGroceryItemState(db, groceries[0].id, {
      checked: true,
      excluded: false,
      onHand: false,
    });
    if (groceries[1]) {
      await setGroceryItemState(db, groceries[1].id, {
        checked: false,
        excluded: true,
        onHand: true,
      });
    }

    const weekly = await buildWeeklySnapshot(db, '2026-04-03');
    expect(weekly.adherenceScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Overall',
          score: 67,
          completed: 2,
          missed: 1,
          pending: 0,
        }),
        expect.objectContaining({
          label: 'Workouts',
          score: 100,
          completed: 1,
          missed: 0,
          pending: 0,
        }),
      ])
    );
    expect(weekly.adherenceSignals).toEqual(
      expect.arrayContaining([
        'Meal miss: Teriyaki Chicken Casserole was skipped.',
        'Workout hit: Full body reset was completed as planned.',
      ])
    );
    expect(weekly.grocerySignals).toEqual(
      expect.arrayContaining([
        'Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced.',
        'Grocery miss: Teriyaki Chicken Casserole still had 1 unresolved grocery item when the meal was missed.',
      ])
    );
  });

  it('saves the next-week experiment into the snapshot', async () => {
    const db = getDb();
    await seedWeek();
    const snapshot = await saveNextWeekExperiment(
      db,
      '2026-04-02',
      'Try 10 min morning mindfulness'
    );
    expect(snapshot.experiment).toBe('Try 10 min morning mindfulness');
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('persists inferred adherence matches and rebuilds them when the week fingerprint changes', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const food = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    const slot = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      title: 'Greek yogurt bowl',
      mealType: 'breakfast',
    });

    let weekly = await buildWeeklySnapshot(db, '2026-04-03');
    expect(weekly.adherenceScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Meals',
          score: 0,
          completed: 0,
          missed: 1,
        }),
      ])
    );
    let matches = await db.adherenceMatches.toArray();
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      planSlotId: slot.id,
      outcome: 'miss',
      matchSource: 'inferred-none',
      confidence: 'inferred',
      weekStart: '2026-03-30',
    });
    const firstFingerprint = matches[0]!.fingerprint;

    await createFoodEntry(db, {
      localDay: '2026-04-02',
      mealType: 'breakfast',
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });

    weekly = await buildWeeklySnapshot(db, '2026-04-03');
    expect(weekly.adherenceScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Meals',
          score: 100,
          completed: 1,
          missed: 0,
          inferredCount: 1,
        }),
      ])
    );
    matches = await db.adherenceMatches.toArray();
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      planSlotId: slot.id,
      outcome: 'hit',
      matchSource: 'food-entry',
      confidence: 'inferred',
      weekStart: '2026-03-30',
    });
    expect(matches[0]!.fingerprint).not.toBe(firstFingerprint);
  });

  it('rebuilds pending adherence matches when the anchor day advances', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const slot = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-03',
      slotType: 'workout',
      itemType: 'freeform',
      title: 'Recovery walk',
    });

    await buildWeeklySnapshot(db, '2026-04-02');
    let matches = await db.adherenceMatches.toArray();
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      planSlotId: slot.id,
      outcome: 'pending',
      matchSource: 'pending',
      confidence: 'inferred',
      weekStart: '2026-03-30',
    });
    const firstFingerprint = matches[0]!.fingerprint;

    await buildWeeklySnapshot(db, '2026-04-04');
    matches = await db.adherenceMatches.toArray();
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      planSlotId: slot.id,
      outcome: 'miss',
      matchSource: 'inferred-none',
      confidence: 'inferred',
      weekStart: '2026-03-30',
    });
    expect(matches[0]!.fingerprint).not.toBe(firstFingerprint);
  });

  it('keeps partial assessments out of the assessment summary', async () => {
    const db = getDb();
    await seedWeek();
    await saveAssessmentProgress(db, {
      localDay: '2026-04-02',
      instrument: 'GAD-7',
      itemResponses: [1, 1],
    });
    const weekly = await buildWeeklySnapshot(db, '2026-04-02');
    expect(weekly.assessmentSummary.some((line) => line.includes('GAD-7'))).toBe(false);
  });

  it('persists the current weekly snapshot when artifacts are explicitly refreshed', async () => {
    const db = getDb();
    await seedWeek();

    const weekly = await refreshWeeklyReviewArtifacts(db, '2026-04-02');

    expect(weekly.snapshot.weekStart).toBe('2026-03-30');
    expect(await db.reviewSnapshots.count()).toBe(1);
    expect(await db.reviewSnapshots.get(weekly.snapshot.id)).toMatchObject({
      weekStart: '2026-03-30',
      headline: weekly.snapshot.headline,
    });
  });
});
