import { describe, expect, it } from 'vitest';
import type { HealthEvent } from '$lib/core/domain/types';
import { saveDailyCheckin, getTodaySnapshot, listEventsForDay } from '$lib/features/today/service';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { saveWorkoutTemplate } from '$lib/features/movement/service';
import { saveFoodCatalogItem } from '$lib/features/nutrition/service';
import { logAnxietyEvent, logSymptomEvent } from '$lib/features/health/service';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('today service', () => {
  const getDb = useTestHealthDb('today-service-test');

  it('saves and re-saves the same day idempotently', async () => {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 4,
      energy: 3,
      stress: 2,
      focus: 5,
      sleepHours: 7.5,
      sleepQuality: 4,
      freeformNote: 'steady',
    });

    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 5,
      energy: 4,
      stress: 2,
      focus: 4,
      sleepHours: 8,
      sleepQuality: 5,
      freeformNote: 'updated',
    });

    expect(await db.dailyRecords.count()).toBe(1);
    expect(await db.healthEvents.count()).toBe(6);

    const snapshot = await getTodaySnapshot(db, '2026-04-02');
    expect(snapshot.dailyRecord?.freeformNote).toBe('updated');
    expect(snapshot.dailyRecord?.mood).toBe(5);
  });

  it('lists same-day events after save', async () => {
    const db = getDb();
    await saveDailyCheckin(db, {
      date: '2026-04-02',
      mood: 4,
      energy: 3,
      stress: 2,
      focus: 4,
      sleepHours: 7,
      sleepQuality: 3,
    });

    const events = await listEventsForDay(db, '2026-04-02');
    expect(events.map((event) => event.eventType)).toEqual([
      'energy',
      'focus',
      'mood',
      'sleepHours',
      'sleepQuality',
      'stress',
    ]);
  });

  it('includes same-day health loop events saved outside the daily check-in flow', async () => {
    const db = getDb();
    const events: HealthEvent[] = [
      {
        id: 'manual-anxiety-2026-04-02',
        createdAt: '2026-04-02T09:10:00Z',
        updatedAt: '2026-04-02T09:10:00Z',
        sourceType: 'manual',
        sourceApp: 'Personal Health Cockpit',
        localDay: '2026-04-02',
        confidence: 1,
        eventType: 'anxiety-episode',
        value: 7,
        payload: { trigger: 'Crowded commute' },
      },
      {
        id: 'imported-sleep-2026-04-02',
        createdAt: '2026-04-02T07:00:00Z',
        updatedAt: '2026-04-02T07:00:00Z',
        sourceType: 'native-companion',
        sourceApp: 'HealthKit Companion · Pyro iPhone',
        sourceTimestamp: '2026-04-02T06:55:00Z',
        localDay: '2026-04-02',
        confidence: 0.98,
        eventType: 'sleep-duration',
        value: 6.5,
        unit: 'hours',
      },
    ];

    await db.healthEvents.bulkAdd(events);

    const snapshot = await getTodaySnapshot(db, '2026-04-02');

    expect(snapshot.events.map((event) => event.eventType)).toEqual([
      'anxiety-episode',
      'sleep-duration',
    ]);
    expect(snapshot.events.map((event) => event.sourceType)).toEqual([
      'manual',
      'native-companion',
    ]);
  });

  it('surfaces the next planned workout for today from the weekly planner', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-02');
    const template = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: template.id,
      title: template.title,
    });

    const snapshot = await getTodaySnapshot(db, '2026-04-02');

    expect(snapshot.plannedWorkout).toMatchObject({
      title: 'Full body reset',
      status: 'planned',
    });
  });

  it('surfaces the canonical planned meal when a planned food slot exists', async () => {
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
      title: food.name,
      mealType: 'breakfast',
    });

    const snapshot = await getTodaySnapshot(db, '2026-04-02');

    expect(snapshot.plannedMeal).toMatchObject({
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      sourceName: 'Local catalog',
    });
    expect(snapshot.plannedMealIssue).toBeNull();
  });

  it('shows a stale planned-meal issue when the canonical slot loses its food source', async () => {
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
      title: food.name,
    });
    await db.foodCatalogItems.delete(food.id);

    const snapshot = await getTodaySnapshot(db, '2026-04-02');

    expect(snapshot.plannedMeal).toBeNull();
    expect(snapshot.plannedMealIssue).toBe(
      'That planned meal no longer exists. Replace it in Plan before using it.'
    );
  });

  it('surfaces explicit issues when planned meal or workout handoffs go stale', async () => {
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
    const workout = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
    });

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      title: food.name,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: workout.id,
      title: workout.title,
    });

    await db.foodCatalogItems.delete(food.id);
    await db.workoutTemplates.delete(workout.id);

    const snapshot = await getTodaySnapshot(db, '2026-04-02');

    expect(snapshot.plannedMeal).toBeNull();
    expect(snapshot.plannedMealIssue).toBe(
      'That planned meal no longer exists. Replace it in Plan before using it.'
    );
    expect(snapshot.plannedWorkout).toBeNull();
    expect(snapshot.plannedWorkoutIssue).toBe(
      'That planned workout no longer exists. Replace it in Plan before using it today.'
    );
  });

  it('builds a recovery adaptation when sleep and strain point to a lighter day', async () => {
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
    const workout = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
    });

    await saveDailyCheckin(db, {
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
      note: 'Heavy pressure behind the eyes.',
    });
    await logAnxietyEvent(db, {
      localDay: '2026-04-02',
      intensity: 7,
      trigger: 'Cramped schedule',
      durationMinutes: 25,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      title: food.name,
      mealType: 'breakfast',
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-02',
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: workout.id,
      title: workout.title,
    });

    const snapshot = await getTodaySnapshot(db, '2026-04-02');

    expect(snapshot.recoveryAdaptation).toMatchObject({
      level: 'recovery',
      headline: 'Recovery mode: simplify the day.',
    });
    expect(snapshot.recoveryAdaptation?.reasons).toContain('Sleep landed under 6 hours.');
    expect(snapshot.recoveryAdaptation?.reasons).toContain('Symptom load is elevated today.');
    expect(snapshot.recoveryAdaptation?.reasons).toContain('Anxiety intensity spiked today.');
    expect(snapshot.recoveryAdaptation?.mealFallback).toContain(
      'Meal fallback: keep the next meal familiar, easy, and protein-forward.'
    );
    expect(snapshot.recoveryAdaptation?.workoutFallback).toContain(
      'Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.'
    );
  });
});
