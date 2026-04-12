import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb, resetTestHealthDb } from '$lib/core/db/test-client';
import NutritionPage from '../../../../src/routes/nutrition/+page.svelte';

describe('Nutrition route', () => {
  beforeEach(async () => {
    await resetTestHealthDb();
    window.history.replaceState({}, '', '/nutrition');
  });

  it('renders the empty state and summary shell', async () => {
    render(NutritionPage);
    expect(screen.getByRole('heading', { name: 'Nutrition' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/No meals logged for today/i)).toBeTruthy();
    });
  });

  it('searches, saves a meal, and reuses it as recurring', async () => {
    render(NutritionPage);

    await screen.findByLabelText('Food search');
    await fireEvent.input(screen.getByLabelText('Food search'), { target: { value: 'oatmeal' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Search foods' }));
    await waitFor(() => {
      expect(screen.getByText(/Oatmeal with berries/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Use match' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save meal' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Save as recurring meal' }));
    await waitFor(() => {
      expect(screen.getByText(/Calories: 320/i)).toBeTruthy();
      expect(screen.getByText(/Recurring meal saved\./i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Reuse meal' }));
    await waitFor(() => {
      expect(screen.getByText(/Calories: 640/i)).toBeTruthy();
    });
  });

  it('saves a custom food and surfaces it in the local catalog', async () => {
    render(NutritionPage);

    await screen.findByLabelText('Meal name');
    await fireEvent.input(screen.getByLabelText('Meal name'), {
      target: { value: 'Turkey chili' },
    });
    await fireEvent.input(screen.getByLabelText('Calories'), { target: { value: '430' } });
    await fireEvent.input(screen.getByLabelText('Protein'), { target: { value: '32' } });
    await fireEvent.input(screen.getByLabelText('Fiber'), { target: { value: '9' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save as custom food' }));

    await waitFor(() => {
      expect(screen.getByText(/Saved to custom food catalog\./i)).toBeTruthy();
      const catalogSection = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('Custom food catalog')
      );
      expect(catalogSection?.textContent).toContain('Turkey chili');
      expect(catalogSection?.textContent).toContain('430 kcal · 32g protein · 9g fiber');
    });
  });

  it('loads cached recipe ideas and uses a recipe to prefill the meal form', async () => {
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

    render(NutritionPage);

    await screen.findByLabelText('Recipe search');
    await fireEvent.input(screen.getByLabelText('Recipe search'), {
      target: { value: 'teriyaki' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Search recipes' }));
    await waitFor(() => {
      const recipeSection = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('Recipe cache')
      );
      expect(recipeSection?.textContent).toContain('Teriyaki Chicken Casserole');
      expect(recipeSection?.textContent).toContain('Japanese');
    });

    await fireEvent.click(screen.getAllByRole('button', { name: 'Use recipe' })[0]!);
    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe(
        'Teriyaki Chicken Casserole'
      );
    });
  });

  it('loads a recommended food directly into the meal draft', async () => {
    const db = getTestHealthDb();
    await db.foodCatalogItems.put({
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

    render(NutritionPage);

    await screen.findByText('Recommended next');
    await fireEvent.click(screen.getByRole('button', { name: 'Load food' }));

    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe(
        'Greek yogurt bowl'
      );
      expect((screen.getByLabelText('Protein') as HTMLInputElement).value).toBe('24');
      expect((screen.getByLabelText('Carbs') as HTMLInputElement).value).toBe('34');
    });
  });

  it('plans the current draft and can reload it later', async () => {
    const db = getTestHealthDb();
    render(NutritionPage);

    await screen.findByLabelText('Meal name');
    await fireEvent.input(screen.getByLabelText('Meal name'), {
      target: { value: 'Protein oats' },
    });
    await fireEvent.input(screen.getByLabelText('Calories'), { target: { value: '380' } });
    await fireEvent.input(screen.getByLabelText('Protein'), { target: { value: '26' } });
    await fireEvent.input(screen.getByLabelText('Fiber'), { target: { value: '7' } });
    await fireEvent.input(screen.getByLabelText('Carbs'), { target: { value: '42' } });
    await fireEvent.input(screen.getByLabelText('Fat'), { target: { value: '10' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Plan next meal' }));

    await waitFor(() => {
      expect(screen.getByText(/Planned next meal saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Protein oats').length).toBeGreaterThan(0);
    });
    expect(await db.planSlots.count()).toBe(1);

    await fireEvent.input(screen.getByLabelText('Meal name'), {
      target: { value: 'Changed draft' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Load into draft' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe('Protein oats');
      expect(screen.getByText(/Planned meal loaded into draft\./i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Clear plan' }));
    await waitFor(() => {
      expect(screen.getByText(/Planned meal cleared\./i)).toBeTruthy();
      expect(screen.getByText(/Nothing planned yet\./i)).toBeTruthy();
    });
    expect(await db.planSlots.count()).toBe(0);
  });

  it('hydrates a review strategy deep link into the meal draft and clears the query', async () => {
    const db = getTestHealthDb();
    await db.foodCatalogItems.put({
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
    window.history.replaceState({}, '', '/nutrition?loadKind=food&loadId=food-catalog-1');

    render(NutritionPage);

    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe(
        'Greek yogurt bowl'
      );
      expect(screen.getByText(/Loaded from Review strategy\./i)).toBeTruthy();
      expect(window.location.search).toBe('');
    });
  });

  it('searches cached packaged foods and loads barcode hits locally', async () => {
    const db = getTestHealthDb();
    await db.foodCatalogItems.put({
      id: 'off:049000028911',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      name: 'Diet Cola',
      sourceType: 'open-food-facts',
      sourceName: 'Open Food Facts',
      brandName: 'Acme Drinks',
      barcode: '049000028911',
      calories: 1,
      protein: 0,
      fiber: 0,
      carbs: 0,
      fat: 0,
    });

    render(NutritionPage);

    await screen.findByLabelText('Packaged product search');
    await fireEvent.input(screen.getByLabelText('Packaged product search'), {
      target: { value: 'cola' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Search packaged foods' }));
    await waitFor(() => {
      const packagedSearch = document.querySelector('.packaged-search');
      expect(packagedSearch?.textContent).toContain('Diet Cola');
      expect(packagedSearch?.textContent).toContain('Acme Drinks');
    });

    await fireEvent.input(screen.getByLabelText('Barcode lookup'), {
      target: { value: '049000028911' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Lookup barcode' }));
    await waitFor(() => {
      expect(screen.getByText(/Packaged food loaded from barcode\./i)).toBeTruthy();
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe('Diet Cola');
    });
  });
});
