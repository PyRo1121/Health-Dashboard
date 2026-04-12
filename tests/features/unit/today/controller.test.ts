import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { logAnxietyEvent, logSymptomEvent } from '$lib/features/health/service';
import { saveFoodCatalogItem } from '$lib/features/nutrition/store';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import {
  applyTodayRecoveryActionPage,
  beginTodaySave,
  clearTodayPlannedMealPage,
  loadTodayPage,
  logTodayPlannedMealPage,
  saveTodayPage,
} from '$lib/features/today/controller';

describe('today controller', () => {
  const getDb = useTestHealthDb();

  it('loads and saves the today page state', async () => {
    const db = getDb();
    let state = await loadTodayPage(db, '2026-04-02');
    expect(state.loading).toBe(false);
    expect(state.todayDate).toBe('2026-04-02');

    state = beginTodaySave({
      ...state,
      form: {
        ...state.form,
        mood: '4',
        energy: '3',
        stress: '2',
        focus: '5',
        sleepHours: '7.5',
        sleepQuality: '4',
        freeformNote: 'Steady start.',
      },
    });
    state = await saveTodayPage(db, state);

    expect(state.saving).toBe(false);
    expect(state.saveNotice).toBe('Saved for today.');
    expect(state.snapshot?.dailyRecord?.mood).toBe(4);
    expect(state.snapshot?.events).toHaveLength(6);
    expect(state.snapshot?.intelligence.primaryRecommendation).toMatchObject({
      kind: 'nutrition_support',
      confidence: 'low',
    });
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('logs and clears a planned meal from the today page state', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const greekYogurt = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: greekYogurt.id,
      mealType: 'breakfast',
      title: greekYogurt.name,
    });

    let state = await loadTodayPage(db, '2026-04-02');
    expect(state.snapshot?.plannedMeal?.name).toBe('Greek yogurt bowl');

    state = await logTodayPlannedMealPage(db, state);
    expect(state.saveNotice).toBe('Planned meal logged.');
    expect(state.snapshot?.plannedMeal).toBeNull();
    expect(state.snapshot?.foodEntries).toHaveLength(1);
    expect(await db.adherenceMatches.count()).toBe(1);
    expect(await db.reviewSnapshots.count()).toBe(1);

    const lentilSoup = await saveFoodCatalogItem(db, {
      name: 'Lentil soup',
      calories: 280,
      protein: 16,
      fiber: 11,
      carbs: 39,
      fat: 6,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: lentilSoup.id,
      mealType: 'lunch',
      title: lentilSoup.name,
    });

    state = await loadTodayPage(db, '2026-04-02');
    state = await clearTodayPlannedMealPage(db, state);
    expect(state.saveNotice).toBe('Planned meal cleared.');
    expect(state.snapshot?.plannedMeal).toBeNull();
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('clears a canonical planned meal slot from the today page state', async () => {
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

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      mealType: 'breakfast',
      title: food.name,
    });

    let state = await loadTodayPage(db, '2026-04-02');
    expect(state.snapshot?.plannedMeal?.name).toBe('Greek yogurt bowl');

    state = await clearTodayPlannedMealPage(db, state);
    expect(state.saveNotice).toBe('Planned meal cleared.');
    expect(state.snapshot?.plannedMeal).toBeNull();
    expect(await db.planSlots.count()).toBe(0);
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('applies the recovery meal and workout swaps from today state', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const toast = await saveFoodCatalogItem(db, {
      name: 'Toast and jam',
      calories: 260,
      protein: 6,
      fiber: 2,
      carbs: 42,
      fat: 6,
    });
    const yogurt = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    const mealSlot = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: toast.id,
      mealType: 'breakfast',
      title: toast.name,
    });
    const workoutSlot = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: 'template-1',
      title: 'Full body reset',
    });

    await db.workoutTemplates.put({
      id: 'template-1',
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-02T08:00:00.000Z',
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
    });
    await db.dailyRecords.put({
      id: 'daily:2026-04-02',
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-02T08:00:00.000Z',
      date: '2026-04-02',
      mood: 3,
      energy: 2,
      stress: 4,
      focus: 3,
      sleepHours: 5.5,
      sleepQuality: 2,
      freeformNote: 'Dragging today.',
    });
    await logSymptomEvent(db, {
      localDay: '2026-04-02',
      symptom: 'Headache',
      severity: 4,
    });
    await logAnxietyEvent(db, {
      localDay: '2026-04-02',
      intensity: 7,
      trigger: 'Cramped schedule',
    });

    let state = await loadTodayPage(db, '2026-04-02');
    state = await applyTodayRecoveryActionPage(db, state, 'apply-recovery-meal');
    expect(state.saveNotice).toBe('Recovery meal applied.');
    expect(state.snapshot?.plannedMeal?.name).toBe('Greek yogurt bowl');
    expect((await db.planSlots.get(mealSlot.id))?.itemId).toBe(yogurt.id);
    expect(state.snapshot?.intelligence.primaryRecommendation).toMatchObject({
      kind: 'recovery',
      primaryAction: { kind: 'recovery-action', actionId: 'apply-recovery-workout' },
    });

    state = await applyTodayRecoveryActionPage(db, state, 'apply-recovery-workout');
    expect(state.saveNotice).toBe('Recovery workout applied.');
    expect(state.snapshot?.plannedWorkout?.title).toBe('Recovery walk');
    expect((await db.planSlots.get(workoutSlot.id))?.itemType).toBe('freeform');
  });
});
