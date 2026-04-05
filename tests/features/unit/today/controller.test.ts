import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { savePlannedMeal } from '$lib/features/nutrition/legacy-planned-meal-store';
import { saveFoodCatalogItem } from '$lib/features/nutrition/service';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import {
  beginTodaySave,
  clearTodayPlannedMealPage,
  loadTodayPage,
  logTodayPlannedMealPage,
  saveTodayPage,
} from '$lib/features/today/controller';

describe('today controller', () => {
  const getDb = useTestHealthDb('today-page-controller');

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
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('migrates a legacy planned meal into a canonical slot when today loads', async () => {
    const db = getDb();
    await savePlannedMeal(db, {
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
      sourceName: 'Legacy planner',
    });

    const state = await loadTodayPage(db, '2026-04-02');

    expect(state.saveNotice).toBe('Legacy planned meal moved into today’s weekly plan.');
    expect(state.snapshot?.plannedMeal?.name).toBe('Greek yogurt bowl');
    expect(await db.plannedMeals.count()).toBe(0);
    expect(await db.planSlots.count()).toBe(1);
  });

  it('logs and clears a planned meal from the today page state', async () => {
    const db = getDb();
    await savePlannedMeal(db, {
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
      sourceName: 'Local catalog',
    });

    let state = await loadTodayPage(db, '2026-04-02');
    expect(state.snapshot?.plannedMeal?.name).toBe('Greek yogurt bowl');

    state = await logTodayPlannedMealPage(db, state);
    expect(state.saveNotice).toBe('Planned meal logged.');
    expect(state.snapshot?.plannedMeal).toBeNull();
    expect(state.snapshot?.foodEntries).toHaveLength(1);
    expect(await db.adherenceMatches.count()).toBe(1);
    expect(await db.reviewSnapshots.count()).toBe(1);

    await savePlannedMeal(db, {
      name: 'Lentil soup',
      mealType: 'lunch',
      calories: 280,
      protein: 16,
      fiber: 11,
      carbs: 39,
      fat: 6,
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
});
