import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { logAnxietyEvent, logSymptomEvent } from '$lib/features/health/service';
import { saveFoodCatalogItem } from '$lib/features/nutrition/store';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { applyTodayRecoveryActionPage, loadTodayPage } from '$lib/features/today/controller';

describe('today recovery action id routing', () => {
  const getDb = useTestHealthDb();

  it('applies the recommended food by item id when duplicate names exist', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const plannedFood = await saveFoodCatalogItem(db, {
      name: 'Toast and jam',
      calories: 260,
      protein: 6,
      fiber: 2,
      carbs: 42,
      fat: 6,
    });
    await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 420,
      protein: 8,
      fiber: 1,
      carbs: 50,
      fat: 18,
    });
    const recommendedFood = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
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
      durationMinutes: 25,
    });

    const plannedSlot = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: plannedFood.id,
      mealType: 'breakfast',
      title: plannedFood.name,
    });

    let state = await loadTodayPage(db, '2026-04-02');
    expect(state.snapshot?.recoveryAdaptation?.mealRecommendation).toMatchObject({
      itemId: recommendedFood.id,
      title: 'Greek yogurt bowl',
    });

    state = await applyTodayRecoveryActionPage(db, state, 'apply-recovery-meal');

    expect(state.saveNotice).toBe('Recovery meal applied.');
    expect((await db.planSlots.get(plannedSlot.id))?.itemId).toBe(recommendedFood.id);
  });
});
