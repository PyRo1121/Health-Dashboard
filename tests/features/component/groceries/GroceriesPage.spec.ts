import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getHealthDb } from '$lib/core/db/client';
import { currentLocalDay } from '$lib/core/domain/time';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import GroceriesPage from '../../../../src/routes/groceries/+page.svelte';
import { expectHeading, resetRouteDb } from '../../../support/component/routeHarness';

describe('Groceries route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('renders recipe-linked grocery items and toggles checklist state', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    await db.recipeCatalogItems.put({
      id: 'themealdb:52772',
      createdAt: '2026-04-07T08:00:00.000Z',
      updatedAt: '2026-04-07T08:00:00.000Z',
      title: 'Teriyaki Chicken Casserole',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52772',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    render(GroceriesPage);
    expectHeading('Groceries');

    await waitFor(() => {
      expect(screen.getByText('soy sauce')).toBeTruthy();
      expect(screen.getAllByText('Teriyaki Chicken Casserole').length).toBeGreaterThan(1);
      expect(screen.getByText(/This Week · week of/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getAllByRole('button', { name: 'On hand' })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Grocery item updated\./i)).toBeTruthy();
      expect(screen.getByText(/Pantry · 3\/4 cup · On hand/i)).toBeTruthy();
    });
  });

  it('adds and removes a manual grocery item from the checklist', async () => {
    render(GroceriesPage);
    expectHeading('Groceries');

    await screen.findByLabelText('Manual grocery item');
    await fireEvent.input(screen.getByLabelText('Manual grocery item'), {
      target: { value: 'Paper towels' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add manual item' }));

    await waitFor(() => {
      expect(screen.getByText(/Manual grocery item added\./i)).toBeTruthy();
      expect(screen.getByText('Paper towels')).toBeTruthy();
      expect(screen.getByText('Manual item')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Remove manual' })).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Remove manual' }));
    await waitFor(() => {
      expect(screen.getByText(/Manual grocery item removed\./i)).toBeTruthy();
      expect(screen.queryByText('Paper towels')).toBeNull();
    });
  });

  it('surfaces grocery warnings when a planned recipe has no usable ingredients', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    await db.recipeCatalogItems.put({
      id: 'themealdb:52774',
      createdAt: '2026-04-07T08:00:00.000Z',
      updatedAt: '2026-04-07T08:00:00.000Z',
      title: 'Mystery bowl',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52774',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: [],
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52774',
      title: 'Mystery bowl',
    });

    render(GroceriesPage);
    expectHeading('Groceries');

    await waitFor(() => {
      expect(
        screen.getByText('Mystery bowl: no ingredients available for grocery generation.')
      ).toBeTruthy();
      expect(
        screen.getByText('No grocery items could be derived from the current recipe slots.')
      ).toBeTruthy();
    });
  });

  it('renders one merged grocery row when duplicate ingredients come from multiple recipes', async () => {
    const db = getHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);
    await db.recipeCatalogItems.bulkPut([
      {
        id: 'themealdb:52772',
        createdAt: '2026-04-07T08:00:00.000Z',
        updatedAt: '2026-04-07T08:00:00.000Z',
        title: 'Teriyaki Chicken Casserole',
        sourceType: 'themealdb',
        sourceName: 'TheMealDB',
        externalId: '52772',
        mealType: 'dinner',
        cuisine: 'Japanese',
        ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
      },
      {
        id: 'themealdb:52773',
        createdAt: '2026-04-07T08:00:00.000Z',
        updatedAt: '2026-04-07T08:00:00.000Z',
        title: 'Soy glazed bowl',
        sourceType: 'themealdb',
        sourceName: 'TheMealDB',
        externalId: '52773',
        mealType: 'dinner',
        cuisine: 'Japanese',
        ingredients: ['1 tbsp soy sauce'],
      },
    ]);
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52773',
      title: 'Soy glazed bowl',
    });

    render(GroceriesPage);
    expectHeading('Groceries');

    await waitFor(() => {
      expect(screen.getAllByText('soy sauce')).toHaveLength(1);
      expect(screen.getByText(/Pantry · 3\/4 cup \+ 1 tbsp/i)).toBeTruthy();
      expect(screen.getByText(/Teriyaki Chicken Casserole, Soy glazed bowl/i)).toBeTruthy();
    });
  });
});
