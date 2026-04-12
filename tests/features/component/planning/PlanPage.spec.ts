import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb } from '$lib/core/db/test-client';
import PlanPage from '../../../../src/routes/plan/+page.svelte';
import { expectHeading, resetRouteDb } from '../../../support/component/routeHarness';

describe('Plan route', () => {
  beforeEach(async () => {
    await resetRouteDb();
  });

  it('creates a workout template and uses it in the weekly board', async () => {
    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Template name');
    await fireEvent.input(screen.getByLabelText('Template name'), {
      target: { value: 'Full body reset' },
    });
    await fireEvent.input(screen.getByLabelText('Template goal'), {
      target: { value: 'Recovery' },
    });
    await fireEvent.input(screen.getByLabelText('Exercise 1'), {
      target: { value: 'Goblet squat' },
    });
    await fireEvent.input(screen.getByLabelText('Sets 1'), {
      target: { value: '3' },
    });
    await fireEvent.input(screen.getByLabelText('Reps 1'), {
      target: { value: '8' },
    });
    await fireEvent.input(screen.getByLabelText('Rest 1'), {
      target: { value: '60' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add exercise row' }));
    await fireEvent.input(screen.getByLabelText('Exercise 2'), {
      target: { value: 'Push-up' },
    });
    await fireEvent.input(screen.getByLabelText('Sets 2'), {
      target: { value: '3' },
    });
    await fireEvent.input(screen.getByLabelText('Reps 2'), {
      target: { value: '12' },
    });
    await fireEvent.input(screen.getByLabelText('Rest 2'), {
      target: { value: '45' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save template' }));

    await waitFor(() => {
      expect(screen.getByText(/Workout template saved\./i)).toBeTruthy();
      expect(screen.getByText('Full body reset')).toBeTruthy();
      expect(
        screen.getByText(/Recovery · 2 exercises · Goblet squat · 3x8 · 60s rest/i)
      ).toBeTruthy();
    });
    const [template] = await getTestHealthDb().workoutTemplates.toArray();
    expect(template?.title).toBe('Full body reset');
    expect(template?.exerciseRefs).toEqual([
      { name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 },
      { name: 'Push-up', sets: 3, reps: '12', restSeconds: 45 },
    ]);

    await fireEvent.change(screen.getByLabelText('Plan slot type'), {
      target: { value: 'workout' },
    });
    await fireEvent.change(screen.getByLabelText('Workout template'), {
      target: { value: template?.id },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));

    await waitFor(() => {
      expect(screen.getByText(/Plan slot saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Full body reset').length).toBeGreaterThan(0);
    });
  });

  it('searches cached exercises and adds one into the template draft', async () => {
    await getTestHealthDb().exerciseCatalogItems.put({
      id: 'wger:1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      sourceType: 'wger',
      externalId: '1',
      title: 'Goblet squat',
      muscleGroups: ['Quadriceps'],
      equipment: ['Dumbbell'],
    });

    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Search exercises');
    await fireEvent.input(screen.getByLabelText('Search exercises'), {
      target: { value: 'squat' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Search exercises' }));

    await waitFor(() => {
      expect(screen.getByText('Goblet squat')).toBeTruthy();
      expect(screen.getByText(/Quadriceps · Dumbbell/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Exercise 1') as HTMLInputElement).value).toBe('Goblet squat');
    });

    await fireEvent.input(screen.getByLabelText('Template name'), {
      target: { value: 'Leg primer' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save template' }));
    await waitFor(() => {
      expect(screen.getByText(/Workout template saved\./i)).toBeTruthy();
    });
    const templates = await getTestHealthDb().workoutTemplates.toArray();
    expect(templates.at(-1)?.exerciseRefs[0]).toEqual(
      expect.objectContaining({
        name: 'Goblet squat',
        exerciseCatalogId: 'wger:1',
      })
    );
  });

  it('derives groceries from a planned recipe slot', async () => {
    const db = getTestHealthDb();
    await db.recipeCatalogItems.put({
      id: 'themealdb:52772',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      title: 'Teriyaki Chicken Casserole',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52772',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: ['3/4 cup soy sauce', '2 chicken breast'],
    });

    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Recipe');
    await fireEvent.change(screen.getByLabelText('Recipe'), {
      target: { value: 'themealdb:52772' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));

    await waitFor(() => {
      expect(screen.getByText(/Plan slot saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Teriyaki Chicken Casserole').length).toBeGreaterThan(1);
      expect(screen.getByText('soy sauce')).toBeTruthy();
      expect(screen.getByText('chicken breast')).toBeTruthy();
      expect(screen.getByText('Pantry')).toBeTruthy();
      expect(screen.getByText('Protein & Dairy')).toBeTruthy();
    });

    await fireEvent.click(screen.getAllByRole('button', { name: 'On hand' })[0]!);
    await waitFor(() => {
      expect(screen.getByText(/Grocery item updated\./i)).toBeTruthy();
      expect(screen.getByText(/Pantry · 3\/4 cup · On hand/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Need it' })).toBeTruthy();
    });
  });

  it('adds a saved food as a meal slot without routing it through recipes', async () => {
    await getTestHealthDb().foodCatalogItems.put({
      id: 'food-catalog-1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      name: 'Greek yogurt bowl',
      sourceType: 'custom',
      sourceName: 'Local catalog',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });

    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Meal source');
    await fireEvent.change(screen.getByLabelText('Meal source'), {
      target: { value: 'food' },
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Saved food')).toBeTruthy();
    });
    await fireEvent.change(screen.getByLabelText('Saved food'), {
      target: { value: 'food-catalog-1' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));

    await waitFor(() => {
      expect(screen.getByText(/Plan slot saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
      expect(screen.getByText(/Saved food · Local catalog · 24g protein/i)).toBeTruthy();
      expect(screen.getByText(/24g protein/i)).toBeTruthy();
    });
  });

  it('moves plan slots up within the same day', async () => {
    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Plan slot type');
    await fireEvent.change(screen.getByLabelText('Plan slot type'), {
      target: { value: 'note' },
    });
    await fireEvent.input(screen.getByLabelText('Note title'), {
      target: { value: 'First slot' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));
    await waitFor(() => {
      expect(screen.getByText(/Plan slot saved\./i)).toBeTruthy();
      expect(screen.getByText('First slot')).toBeTruthy();
    });

    await fireEvent.change(screen.getByLabelText('Plan slot type'), {
      target: { value: 'note' },
    });
    await fireEvent.input(screen.getByLabelText('Note title'), {
      target: { value: 'Second slot' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));

    await waitFor(() => {
      expect(screen.getByText('First slot')).toBeTruthy();
      expect(screen.getByText('Second slot')).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Move up Second slot' }));

    await waitFor(() => {
      const slots = getTestHealthDb().planSlots.toArray();
      return slots.then((items) => {
        const ordered = items
          .filter((item) => item.localDay === items[0]?.localDay)
          .sort((left, right) => left.order - right.order);
        expect(ordered.map((item) => item.title)).toEqual(['Second slot', 'First slot']);
      });
    });
  });

  it('shows a visible error when a selected recipe disappears before save', async () => {
    const db = getTestHealthDb();
    await db.recipeCatalogItems.put({
      id: 'themealdb:52772',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      title: 'Teriyaki Chicken Casserole',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52772',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: ['3/4 cup soy sauce'],
    });

    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Recipe');
    await fireEvent.change(screen.getByLabelText('Recipe'), {
      target: { value: 'themealdb:52772' },
    });
    await db.recipeCatalogItems.delete('themealdb:52772');
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'That recipe no longer exists. Choose another before adding it to the week.'
        )
      ).toBeTruthy();
    });
    expect(await db.planSlots.count()).toBe(0);
  });

  it('shows a warning row when a planned recipe has no ingredients for grocery generation', async () => {
    const db = getTestHealthDb();
    await db.recipeCatalogItems.put({
      id: 'themealdb:52774',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      title: 'Mystery bowl',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52774',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: [],
    });

    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Recipe');
    await fireEvent.change(screen.getByLabelText('Recipe'), {
      target: { value: 'themealdb:52774' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add to week' }));

    await waitFor(() => {
      expect(screen.getByText(/Plan slot saved\./i)).toBeTruthy();
      expect(
        screen.getByText('Mystery bowl: no ingredients available for grocery generation.')
      ).toBeTruthy();
      expect(
        screen.getByText('No grocery items could be derived from the current recipe slots.')
      ).toBeTruthy();
    });
  });

  it('adds and removes a manual grocery item from the planning grocery draft', async () => {
    render(PlanPage);
    expectHeading('Plan');

    await screen.findByLabelText('Manual grocery item');
    await fireEvent.input(screen.getByLabelText('Manual grocery item'), {
      target: { value: 'Paper towels' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add manual item' }));

    await waitFor(() => {
      expect(screen.getByText(/Manual grocery item added\./i)).toBeTruthy();
      expect(screen.getByText('Paper towels')).toBeTruthy();
      expect(screen.getByText('Manual item')).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Remove manual' }));
    await waitFor(() => {
      expect(screen.getByText(/Manual grocery item removed\./i)).toBeTruthy();
      expect(screen.queryByText('Paper towels')).toBeNull();
    });
  });
});
