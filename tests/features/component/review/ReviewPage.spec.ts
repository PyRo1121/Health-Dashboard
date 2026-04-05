import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRouteDb, expectHeading, waitForText } from '../../../support/component/routeHarness';
import { seedReviewSnapshotInputs } from '../../../support/component/routeSeeds';
import { getHealthDb } from '$lib/core/db/client';
import { saveJournalEntry } from '$lib/features/journal/service';
import { createFoodEntry, saveFoodCatalogItem } from '$lib/features/nutrition/service';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';

vi.mock('$lib/features/review/client', async () => {
  const actual = await vi.importActual<typeof import('$lib/features/review/client')>(
    '$lib/features/review/client'
  );
  return {
    ...actual,
    loadReviewPage: () => actual.loadReviewPage('2026-04-04'),
  };
});

import ReviewPage from '../../../../src/routes/review/+page.svelte';

describe('Review route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders an empty-state weekly briefing when there is no data', async () => {
    render(ReviewPage);
    expectHeading('Review');
    await waitForText(/Need more data to build your first weekly briefing/i);
  });

  it('shows a weekly briefing and saves an experiment', async () => {
    await seedReviewSnapshotInputs();

    render(ReviewPage);

    await waitForText(/Mindful reset/i);
    await waitForText(/Higher sleep tracked with better mood/i);
    await waitForText(/Low sleep lined up with higher anxiety on 2026-03-31/i);
    await waitForText(/Actual adherence/i);
    await waitForText('Overall');
    await waitForText('Meals');
    await waitForText('Workouts');
    await waitForText(/1 hit, 1 miss, 1 inferred\./i);
    await waitForText(/1 hit, 0 misses\./i);
    await waitForText(/0 hits, 1 miss, 1 inferred\./i);
    await waitForText(/Meal hit: Teriyaki Chicken Casserole was completed as planned\./i);
    await waitForText(/No grocery misses or waste signals surfaced this week\./i);
    await waitForText(/This Week: 1\/2 plan items completed\./i);
    await waitForText(/Groceries: 1\/2 checked, 1 on hand, 1 excluded\./i);
    await waitForText(/Sleep duration: 8 hours on 2026-04-02/i);
    expect(screen.getByRole('link', { name: 'Load food' }).getAttribute('href')).toMatch(
      /^\/nutrition\?loadKind=food&loadId=/
    );
    expect(screen.getByRole('link', { name: 'Load recipe' }).getAttribute('href')).toBe(
      '/nutrition?loadKind=recipe&loadId=themealdb%3A52772'
    );

    await fireEvent.change(screen.getByLabelText('Next-week experiment'), {
      target: { value: 'Increase hydration tracking' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save experiment' }));

    await waitFor(() => {
      expect(screen.getByText(/Experiment saved\./i)).toBeTruthy();
    });
  });

  it('labels inferred adherence explicitly inside the review audit', async () => {
    const db = getHealthDb();
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
      title: 'Greek yogurt bowl',
      mealType: 'breakfast',
    });
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

    render(ReviewPage);
    expectHeading('Review');

    await waitFor(() => {
      expect(screen.getAllByText(/1 hit, 0 misses, 1 inferred\./i).length).toBeGreaterThan(0);
    });
    await waitForText('Inferred');
    await waitFor(() => {
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
    });
    await waitForText(/Meal inferred hit: matched a logged meal on 2026-04-02\./i);
  });

  it('shows actual misses and grocery waste when a planned meal slips', async () => {
    await seedReviewSnapshotInputs();
    const db = getHealthDb();
    const planSlots = await db.planSlots.toArray();
    const mealSlot = planSlots.find((slot) => slot.slotType === 'meal');
    const workoutSlot = planSlots.find((slot) => slot.slotType === 'workout');
    if (!mealSlot || !workoutSlot) {
      throw new Error('Expected seeded plan slots');
    }

    await db.planSlots.put({
      ...mealSlot,
      status: 'skipped',
    });
    await db.planSlots.put({
      ...workoutSlot,
      status: 'done',
    });

    render(ReviewPage);
    expectHeading('Review');

    await waitForText('50%');
    await waitForText('0%');
    await waitForText(/Meal miss: Teriyaki Chicken Casserole was skipped\./i);
    await waitForText(/Workout hit: Recovery walk was completed as planned\./i);
    await waitForText(
      /Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced\./i
    );
    await waitForText(
      /Grocery miss: Teriyaki Chicken Casserole still had 1 unresolved grocery item when the meal was missed\./i
    );
  });

  it('shows a skip strategy card when a meal plan was skipped', async () => {
    await seedReviewSnapshotInputs();
    const db = getHealthDb();
    const mealSlot = (await db.planSlots.toArray()).find((slot) => slot.slotType === 'meal');
    if (!mealSlot) {
      throw new Error('Expected seeded meal slot');
    }
    await db.planSlots.put({
      ...mealSlot,
      status: 'skipped',
    });

    render(ReviewPage);
    expectHeading('Review');

    await waitForText('Skip');
    await waitForText(/skipped in the weekly plan/i);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Review recipe' })).toBeTruthy();
    });
  });

  it('shows context signals and journal excerpts inside review', async () => {
    await seedReviewSnapshotInputs();
    const db = getHealthDb();
    await saveJournalEntry(db, {
      localDay: '2026-03-31',
      entryType: 'evening_review',
      title: 'Rough afternoon',
      body: 'Crowded store and headache drained the afternoon.',
      tags: [],
      linkedEventIds: [],
    });

    render(ReviewPage);
    expectHeading('Review');

    await waitForText('Context signals');
    await waitForText('Journal excerpts');
    await waitForText(/Low sleep and a written reflection both landed on 2026-03-31\./i);
    await waitForText(/Evening review on 2026-03-31: Crowded store and headache drained the afternoon\./i);
  });
});
