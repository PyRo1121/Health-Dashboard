import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getHealthDb } from '$lib/core/db/client';
import { currentLocalDay } from '$lib/core/domain/time';
import { logAnxietyEvent, logSymptomEvent } from '$lib/features/health/service';
import { saveWorkoutTemplate } from '$lib/features/movement/service';
import { saveFoodCatalogItem } from '$lib/features/nutrition/service';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import TodayPage from '../../../../src/routes/today/+page.svelte';
import { expectHeading, resetRouteDb, waitForText } from '../../../support/component/routeHarness';

describe('Today route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders an empty first-use state', async () => {
    render(TodayPage);

    expectHeading('Today');
    await waitForText(/Nothing logged yet today/i);
  });

  it('saves a daily check-in and shows the event stream', async () => {
    render(TodayPage);

    await screen.findByLabelText('Mood');
    await fireEvent.input(screen.getByLabelText('Mood'), { target: { value: '4' } });
    await fireEvent.input(screen.getByLabelText('Energy'), { target: { value: '3' } });
    await fireEvent.input(screen.getByLabelText('Stress'), { target: { value: '2' } });
    await fireEvent.input(screen.getByLabelText('Focus'), { target: { value: '5' } });
    await fireEvent.input(screen.getByLabelText('Sleep hours'), { target: { value: '7.5' } });
    await fireEvent.input(screen.getByLabelText('Sleep quality'), { target: { value: '4' } });
    await fireEvent.input(screen.getByLabelText('Today note'), {
      target: { value: 'Steady start.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));

    await waitFor(() => {
      expect(screen.getByText('Saved for today.')).toBeTruthy();
      expect(screen.getByText('Steady start.')).toBeTruthy();
      expect(screen.getByText('mood')).toBeTruthy();
    });
  });

  it('shows same-day manual and imported health events in the event stream', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    await db.healthEvents.bulkAdd([
      {
        id: `manual-anxiety-${localDay}`,
        createdAt: '2026-04-02T09:10:00Z',
        updatedAt: '2026-04-02T09:10:00Z',
        sourceType: 'manual',
        sourceApp: 'Personal Health Cockpit',
        localDay,
        confidence: 1,
        eventType: 'anxiety-episode',
        value: 7,
        payload: { trigger: 'Crowded commute' },
      },
      {
        id: `imported-sleep-${localDay}`,
        createdAt: '2026-04-02T07:00:00Z',
        updatedAt: '2026-04-02T07:00:00Z',
        sourceType: 'native-companion',
        sourceApp: 'HealthKit Companion · Pyro iPhone',
        sourceTimestamp: '2026-04-02T06:55:00Z',
        localDay,
        confidence: 0.98,
        eventType: 'sleep-duration',
        value: 6.5,
        unit: 'hours',
      },
    ]);

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getByText('Anxiety episode')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
      expect(screen.getByText('Sleep duration')).toBeTruthy();
      expect(screen.getByText('6.5 hours')).toBeTruthy();
    });
  });

  it('shows a planned meal and lets today log it immediately', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
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
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      mealType: 'breakfast',
      title: food.name,
    });

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
      expect(screen.getByText(/Meal type: breakfast/i)).toBeTruthy();
    });
    expect(await db.planSlots.count()).toBe(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Log planned meal' }));
    await waitFor(() => {
      expect(screen.getByText(/Planned meal logged\./i)).toBeTruthy();
      expect(screen.getByText(/Meals logged: 1/i)).toBeTruthy();
      expect(screen.getByText(/Latest meal: Greek yogurt bowl/i)).toBeTruthy();
      expect(screen.getByText(/Calories: 310/i)).toBeTruthy();
      expect(screen.getByText(/Protein: 24/i)).toBeTruthy();
      expect(screen.getByText(/Protein pace/i)).toBeTruthy();
    });
  });

  it('shows today plan slots and lets the user mark them done', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'note',
      itemType: 'freeform',
      title: 'Prep groceries',
      notes: 'Buy everything before dinner',
    });

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getByText('Prep groceries')).toBeTruthy();
      expect(screen.getByText(/Buy everything before dinner/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => {
      expect(screen.getByText(/Plan item marked done\./i)).toBeTruthy();
    });
  });

  it('shows richer workout plan summaries from the planner domain', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    const template = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [
        {
          name: 'Goblet squat',
          exerciseCatalogId: 'wger:1',
          sets: 3,
          reps: '8',
          restSeconds: 60,
        },
      ],
    });
    await db.exerciseCatalogItems.put({
      id: 'wger:1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      sourceType: 'wger',
      externalId: '1',
      title: 'Goblet squat',
      muscleGroups: ['Quadriceps'],
      equipment: ['Dumbbell'],
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: template.id,
      title: template.title,
    });

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getAllByText('Full body reset').length).toBeGreaterThan(1);
      expect(
        screen.getAllByText(/Recovery · 1 exercise · Quadriceps · Dumbbell/i).length
      ).toBeGreaterThan(1);
      expect(screen.getByText('Planned workout')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Mark workout done' })).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Mark workout done' }));
    await waitFor(() => {
      expect(screen.getByText(/Plan item marked done\./i)).toBeTruthy();
    });
  });

  it('shows saved-food meal summaries from the planner domain', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
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
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      title: food.name,
    });

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(1);
      expect(screen.getByText(/Saved food · Local catalog · 24g protein/i)).toBeTruthy();
      expect(screen.getByText(/Meal type: meal/i)).toBeTruthy();
      expect(screen.getByText(/Projected protein: 24/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Log planned meal' }));
    await waitFor(() => {
      expect(screen.getByText(/Planned meal logged\./i)).toBeTruthy();
      expect(screen.getByText(/Meals logged: 1/i)).toBeTruthy();
      expect(screen.getByText(/Latest meal: Greek yogurt bowl/i)).toBeTruthy();
    });
  });

  it('shows explicit stale-item messaging when planned handoffs no longer resolve', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    const food = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    const template = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 }],
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      title: food.name,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: template.id,
      title: template.title,
    });
    await db.foodCatalogItems.delete(food.id);
    await db.workoutTemplates.delete(template.id);

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(
        screen.getByText('That planned meal no longer exists. Replace it in Plan before using it.')
      ).toBeTruthy();
      expect(
        screen.getByText(
          'That planned workout no longer exists. Replace it in Plan before using it today.'
        )
      ).toBeTruthy();
    });
  });

  it('surfaces a recovery-aware fallback when sleep and symptoms are rough', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    const food = await saveFoodCatalogItem(db, {
      name: 'Toast and jam',
      calories: 260,
      protein: 6,
      fiber: 2,
      carbs: 42,
      fat: 6,
    });
    await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    const template = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
    });

    await db.dailyRecords.put({
      id: `daily:${localDay}`,
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-02T08:00:00.000Z',
      date: localDay,
      mood: 3,
      energy: 2,
      stress: 4,
      focus: 3,
      sleepHours: 5.5,
      sleepQuality: 2,
      freeformNote: 'Dragging today.',
    });
    await logSymptomEvent(db, {
      localDay,
      symptom: 'Headache',
      severity: 4,
      note: 'Heavy pressure behind the eyes.',
    });
    await logAnxietyEvent(db, {
      localDay,
      intensity: 7,
      trigger: 'Cramped schedule',
      durationMinutes: 25,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      mealType: 'breakfast',
      title: food.name,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: template.id,
      title: template.title,
    });

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getByText('Recovery today')).toBeTruthy();
      expect(screen.getByText('Recovery mode: simplify the day.')).toBeTruthy();
      expect(screen.getByText('Sleep landed under 6 hours.')).toBeTruthy();
      expect(screen.getByText('Symptom load is elevated today.')).toBeTruthy();
      expect(screen.getByText('Anxiety intensity spiked today.')).toBeTruthy();
      expect(
        screen.getByText('Meal fallback: keep the next meal familiar, easy, and protein-forward.')
      ).toBeTruthy();
      expect(
        screen.getByText(
          'Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.'
        )
      ).toBeTruthy();
      expect(screen.getByText('Greek yogurt bowl')).toBeTruthy();
      expect(screen.getByText(/310 kcal/i)).toBeTruthy();
      expect(screen.getByText('Recovery walk')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Swap to recovery meal' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Swap to recovery walk' })).toBeTruthy();
      expect(
        screen.getByRole('link', { name: 'Capture recovery note' }).getAttribute('href')
      ).toMatch(/^\/journal\?/);
    });
  });

  it('lets recovery mode swap the meal and workout to fallback suggestions', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    const food = await saveFoodCatalogItem(db, {
      name: 'Toast and jam',
      calories: 260,
      protein: 6,
      fiber: 2,
      carbs: 42,
      fat: 6,
    });
    await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    const template = await saveWorkoutTemplate(db, {
      title: 'Full body reset',
      goal: 'Recovery',
      exerciseRefs: [{ name: 'Goblet squat', reps: '8', sets: 3, restSeconds: 60 }],
    });

    await db.dailyRecords.put({
      id: `daily:${localDay}`,
      createdAt: '2026-04-02T08:00:00.000Z',
      updatedAt: '2026-04-02T08:00:00.000Z',
      date: localDay,
      mood: 3,
      energy: 2,
      stress: 4,
      focus: 3,
      sleepHours: 5.5,
      sleepQuality: 2,
      freeformNote: 'Dragging today.',
    });
    await logSymptomEvent(db, {
      localDay,
      symptom: 'Headache',
      severity: 4,
      note: 'Heavy pressure behind the eyes.',
    });
    await logAnxietyEvent(db, {
      localDay,
      intensity: 7,
      trigger: 'Cramped schedule',
      durationMinutes: 25,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: food.id,
      mealType: 'breakfast',
      title: food.name,
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'workout',
      itemType: 'workout-template',
      itemId: template.id,
      title: template.title,
    });

    render(TodayPage);
    expectHeading('Today');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Swap to recovery meal' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Swap to recovery walk' })).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Swap to recovery meal' }));
    await waitFor(() => {
      expect(screen.getByText(/Recovery meal applied\./i)).toBeTruthy();
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Swap to recovery walk' }));
    await waitFor(() => {
      expect(screen.getByText(/Recovery workout applied\./i)).toBeTruthy();
      expect(screen.getAllByText('Recovery walk').length).toBeGreaterThan(0);
    });
  });
});
