import { describe, expect, it } from 'vitest';
import { saveAssessmentProgress, submitAssessment } from '$lib/features/assessments/service';
import { deriveWeeklyGroceries, setGroceryItemState } from '$lib/features/groceries/service';
import { logAnxietyEvent, logSymptomEvent } from '$lib/features/health/service';
import { commitImportBatch, previewImport } from '$lib/features/imports/store';
import { saveJournalEntry } from '$lib/features/journal/service';
import {
  createFoodEntry,
  saveFoodCatalogItem,
  upsertRecipeCatalogItem,
} from '$lib/features/nutrition/store';
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
import { saveDailyCheckin } from '$lib/features/today/actions';
import { HEALTHKIT_BUNDLE_JSON } from '../../../support/fixtures/healthkit-bundle';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('review service', () => {
  const getDb = useTestHealthDb();

  function readCandidateId(candidate: unknown): string | undefined {
    if (!candidate || typeof candidate !== 'object') {
      return undefined;
    }

    const { id } = candidate as { id?: unknown };
    return typeof id === 'string' ? id : undefined;
  }

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

  it('builds a weekly snapshot with ranked experiment candidates and stable ids', async () => {
    const db = getDb();
    await seedWeek();
    await saveFoodCatalogItem(db, {
      name: 'Higher protein breakfast',
      calories: 420,
      protein: 32,
      fiber: 8,
      carbs: 34,
      fat: 12,
    });
    const weekly = await buildWeeklySnapshot(db, '2026-04-02');
    expect(weekly.snapshot.headline).toBeTruthy();
    expect(weekly.snapshot.daysTracked).toBe(3);
    expect(weekly.experimentOptions).toHaveLength(3);
    expect(weekly.experimentCandidates).toHaveLength(3);
    expect(weekly.assessmentSummary[0]).toContain('WHO-5');
    expect(weekly.deviceHighlights.some((line) => line.includes('Sleep'))).toBe(true);
    expect(weekly.weeklyRecommendation).toMatchObject({
      decision: 'continue',
      title: 'Continue with Higher protein breakfast',
      actionLabel: 'Load food',
      target: {
        kind: 'food',
      },
    });
    expect(weekly.whatChangedHighlights.length).toBeGreaterThan(0);
    expect(weekly.experimentCandidates?.map((candidate) => candidate.label)).toEqual([
      'Increase protein at breakfast',
      'Increase hydration tracking',
      'Try 10 min morning mindfulness',
    ]);
    expect(weekly.experimentCandidates?.map((candidate) => readCandidateId(candidate))).toEqual([
      expect.stringMatching(/^[a-z0-9-]+$/),
      expect.stringMatching(/^[a-z0-9-]+$/),
      expect.stringMatching(/^[a-z0-9-]+$/),
    ]);
    expect(
      new Set(weekly.experimentCandidates?.map((candidate) => readCandidateId(candidate))).size
    ).toBe(3);
    expect(weekly.experimentOptions).toEqual(
      weekly.experimentCandidates?.map((candidate) => candidate.label)
    );
  });

  it('keeps sparse weeks in a no-recommendation fallback until deterministic inputs exist', async () => {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 4,
      energy: 3,
      stress: 2,
      focus: 3,
      sleepHours: 7,
      sleepQuality: 3,
    });

    const weekly = await buildWeeklySnapshot(db, '2026-04-02');

    expect(weekly.snapshot.headline).toBe('Mindful reset');
    expect(weekly.snapshot.daysTracked).toBe(1);
    expect(weekly.weeklyRecommendation).toBeNull();
    expect(weekly.weeklyDecisionCards).toEqual([]);
    expect(weekly.whatChangedHighlights).toEqual([]);
  });

  it('prioritizes the strongest weekly changes instead of preserving raw source order', async () => {
    const db = getDb();
    await seedWeek();
    await logAnxietyEvent(db, {
      localDay: '2026-04-02',
      intensity: 4,
      trigger: 'Busy inbox',
      note: 'Walked it off',
    });
    await saveJournalEntry(db, {
      localDay: '2026-04-02',
      entryType: 'evening_review',
      title: 'Rough afternoon',
      body: 'Crowded store and headache drained the afternoon.',
      tags: [],
      linkedEventIds: [],
    });

    const weekly = await buildWeeklySnapshot(db, '2026-04-02');

    expect(weekly.whatChangedHighlights[0]).toBe('WHO-5: Moderate wellbeing (17)');
    expect(weekly.whatChangedHighlights).toEqual(
      expect.arrayContaining([
        'Anxiety and written context both surfaced on 2026-04-02.',
        'Step count: 8432 count on 2026-04-02',
        'Sleep duration: 8 hours on 2026-04-02',
      ])
    );
  });

  it('ranks mindfulness first with a deterministic candidate id when the week is dominated by sleep and anxiety signals', async () => {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 3,
      energy: 2,
      stress: 4,
      focus: 2,
      sleepHours: 5.5,
      sleepQuality: 2,
    });
    await logAnxietyEvent(db, {
      localDay: '2026-04-02',
      intensity: 4,
      trigger: 'Crowded store',
      note: 'Walked it off',
    });
    await saveJournalEntry(db, {
      localDay: '2026-04-02',
      entryType: 'evening_review',
      title: 'Rough afternoon',
      body: 'Crowded store and headache drained the afternoon.',
      tags: [],
      linkedEventIds: [],
    });

    const weekly = await buildWeeklySnapshot(db, '2026-04-02');

    expect(weekly.experimentCandidates?.map((candidate) => candidate.label)).toEqual([
      'Try 10 min morning mindfulness',
      'Increase protein at breakfast',
      'Increase hydration tracking',
    ]);
    expect(readCandidateId(weekly.experimentCandidates?.[0])).toEqual(
      expect.stringMatching(/^[a-z0-9-]+$/)
    );
  });

  it('threads journal excerpts and context signals into the weekly snapshot', async () => {
    const db = getDb();
    await seedWeek();
    await saveJournalEntry(db, {
      localDay: '2026-03-30',
      entryType: 'evening_review',
      title: 'Rough afternoon',
      body: 'Crowded store and headache drained the afternoon.',
      tags: [],
      linkedEventIds: [],
    });

    const weekly = await buildWeeklySnapshot(db, '2026-04-02');

    expect(weekly.contextSignals).toContain(
      'Low sleep and a written reflection both landed on 2026-03-30.'
    );
    expect(weekly.journalHighlights).toContain(
      'Evening review on 2026-03-30: Crowded store and headache drained the afternoon.'
    );
  });

  it('captures repeated journal-linked patterns in the weekly snapshot', async () => {
    const db = getDb();
    await seedWeek();

    const symptomOne = await logSymptomEvent(db, {
      localDay: '2026-03-30',
      symptom: 'Headache',
      severity: 4,
    });
    const symptomTwo = await logSymptomEvent(db, {
      localDay: '2026-03-31',
      symptom: 'Headache',
      severity: 4,
    });
    const anxietyOne = await logAnxietyEvent(db, {
      localDay: '2026-03-30',
      intensity: 6,
      trigger: 'Crowded store',
    });
    const anxietyTwo = await logAnxietyEvent(db, {
      localDay: '2026-03-31',
      intensity: 6,
      trigger: 'Cramped schedule',
    });

    await saveJournalEntry(db, {
      localDay: '2026-03-30',
      entryType: 'symptom_note',
      title: 'Headache note',
      body: 'Headache and worry hit after lunch.',
      tags: [],
      linkedEventIds: [symptomOne.id, anxietyOne.id],
    });
    await saveJournalEntry(db, {
      localDay: '2026-03-31',
      entryType: 'symptom_note',
      title: 'Headache note',
      body: 'Headache and worry hit again after errands.',
      tags: [],
      linkedEventIds: [symptomTwo.id, anxietyTwo.id],
    });

    const weekly = await buildWeeklySnapshot(db, '2026-04-02');

    expect(weekly.patternHighlights).toContain(
      'Headache kept showing up in your notes on 2 days this week.'
    );
    expect(weekly.patternHighlights).toContain(
      'Anxiety-related context showed up in your notes on 2 days this week.'
    );
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

  it('saves a selected experiment by candidate id without disturbing ranked suggestions', async () => {
    const db = getDb();
    await seedWeek();
    const beforeSave = await buildWeeklySnapshot(db, '2026-04-02');

    expect(beforeSave.experimentCandidates?.map((candidate) => candidate.label)).toEqual([
      'Increase protein at breakfast',
      'Increase hydration tracking',
      'Try 10 min morning mindfulness',
    ]);

    const selectedExperiment = beforeSave.experimentCandidates?.[1];
    if (!selectedExperiment) {
      throw new Error('Expected a deterministic ranked experiment candidate list before saving.');
    }

    const selectedExperimentId = readCandidateId(selectedExperiment);
    if (!selectedExperimentId) {
      throw new Error('Expected the selected experiment candidate to expose a stable id.');
    }

    const snapshot = await saveNextWeekExperiment(
      db,
      '2026-04-02',
      selectedExperiment.label,
      selectedExperimentId
    );
    expect(snapshot.experiment).toBe(selectedExperiment.label);
    expect(snapshot.experimentId).toBe(selectedExperimentId);
    expect(await db.reviewSnapshots.count()).toBe(1);

    const rebuilt = await buildWeeklySnapshot(db, '2026-04-02');
    expect(rebuilt.snapshot.experiment).toBe(selectedExperiment.label);
    expect(rebuilt.snapshot.experimentId).toBe(selectedExperimentId);
    expect(rebuilt.experimentCandidates?.map((candidate) => candidate.label)).toEqual(
      beforeSave.experimentCandidates?.map((candidate) => candidate.label)
    );
    expect(rebuilt.experimentCandidates?.map((candidate) => readCandidateId(candidate))).toEqual(
      beforeSave.experimentCandidates?.map((candidate) => readCandidateId(candidate))
    );
    expect(rebuilt.experimentOptions).toEqual(beforeSave.experimentOptions);
  });

  it('builds a verdict for the saved experiment from the same weekly signals', async () => {
    const db = getDb();
    await seedWeek();
    await saveNextWeekExperiment(db, '2026-04-02', 'Increase protein at breakfast');

    const weekly = await buildWeeklySnapshot(db, '2026-04-02');

    expect(weekly.savedExperimentVerdict).toMatchObject({
      decision: 'continue',
      label: 'Increase protein at breakfast',
      confidence: 'medium',
    });
    expect(weekly.savedExperimentVerdict?.expectedImpact).toMatch(/protein consistency/i);
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
