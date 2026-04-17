import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import { getTestHealthDb, resetTestHealthDb } from '$lib/core/db/test-client';
import { currentLocalDay } from '$lib/core/domain/time';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
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
    expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Protein') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Fiber') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Carbs') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Fat') as HTMLInputElement).value).toBe('');
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

  it('shows unknown summary totals instead of zeroes after saving a name-only meal', async () => {
    render(NutritionPage);

    await screen.findByLabelText('Meal name');
    await fireEvent.input(screen.getByLabelText('Meal name'), {
      target: { value: 'Teriyaki Chicken Casserole' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save meal' }));

    await waitFor(() => {
      expect(screen.getByText(/Meal saved\./i)).toBeTruthy();
      const summarySection = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('Today summary')
      );
      expect(summarySection?.textContent).toContain('Teriyaki Chicken Casserole');
      expect(summarySection?.textContent).toContain('Calories: unknown');
      expect(summarySection?.textContent).toContain('Protein: unknown');
      expect(summarySection?.textContent).not.toContain('Calories: 0');
      expect(summarySection?.textContent).not.toContain('Protein: 0');
    });
  });

  it('does not fabricate zero macros when a recipe-loaded draft is saved into the custom catalog', async () => {
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
    await fireEvent.click(screen.getAllByRole('button', { name: 'Use recipe' })[0]!);
    await waitFor(() => {
      expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('');
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Save as custom food' }));
    await waitFor(() => {
      expect(screen.getByText(/Saved to custom food catalog\./i)).toBeTruthy();
      const catalogSection = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('Custom food catalog')
      );
      expect(catalogSection?.textContent).toContain('Teriyaki Chicken Casserole');
      expect(catalogSection?.textContent).not.toContain('0 kcal');
      expect(catalogSection?.textContent).not.toContain('0g protein');
      expect(catalogSection?.textContent).toContain('Nutrition totals unknown.');
    });
  });

  it('does not fabricate zero macros when saving a name-only custom food from a fresh draft', async () => {
    render(NutritionPage);

    await screen.findByLabelText('Meal name');
    await fireEvent.input(screen.getByLabelText('Meal name'), {
      target: { value: 'Mystery soup' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save as custom food' }));

    await waitFor(() => {
      expect(screen.getByText(/Saved to custom food catalog\./i)).toBeTruthy();
      const catalogSection = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('Custom food catalog')
      );
      expect(catalogSection?.textContent).toContain('Mystery soup');
      expect(catalogSection?.textContent).toContain('Nutrition totals unknown.');
      expect(catalogSection?.textContent).not.toContain('0 kcal');
      expect(catalogSection?.textContent).not.toContain('0g protein');
    });
  });

  it('does not fabricate zero macros when an unknown-macro custom food is searched and reused', async () => {
    const db = getTestHealthDb();
    await db.foodCatalogItems.put({
      id: 'food-catalog-1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      name: 'Teriyaki Chicken Casserole',
      sourceType: 'custom',
      sourceName: 'Local catalog',
    });

    render(NutritionPage);

    await screen.findByLabelText('Food search');
    await fireEvent.input(screen.getByLabelText('Food search'), {
      target: { value: 'teriyaki' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Search foods' }));

    await waitFor(() => {
      const mealLoggingSection = Array.from(document.querySelectorAll('section')).find((section) =>
        section.textContent?.includes('Meal logging')
      );
      expect(mealLoggingSection?.textContent).toContain('Teriyaki Chicken Casserole');
      expect(mealLoggingSection?.textContent).toContain('Nutrition totals unknown.');
      expect(mealLoggingSection?.textContent).not.toContain('0 kcal');
      expect(mealLoggingSection?.textContent).not.toContain('0g protein');
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Use match' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe(
        'Teriyaki Chicken Casserole'
      );
      expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Protein') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Fiber') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Carbs') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Fat') as HTMLInputElement).value).toBe('');
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
      expect((screen.getByLabelText('Meal type') as HTMLSelectElement).value).toBe('dinner');
      expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Protein') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Fiber') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Carbs') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Fat') as HTMLInputElement).value).toBe('');
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

  it('plans a recommended saved food without duplicating the local catalog item', async () => {
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
    await fireEvent.click(screen.getByRole('button', { name: 'Plan next' }));

    await waitFor(() => {
      expect(screen.getByText(/Planned next meal saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
    });

    const planSlots = await db.planSlots.toArray();
    expect(planSlots).toHaveLength(1);
    expect(planSlots[0]?.itemId).toBe('food-catalog-1');
    expect(await db.foodCatalogItems.count()).toBe(1);
  });

  it('plans a recommended recipe as a recipe slot without cloning it into the local food catalog', async () => {
    const db = getTestHealthDb();
    await db.recipeCatalogItems.put({
      id: 'recipe-1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      title: 'Teriyaki Chicken Bowl',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52772',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: ['Chicken', 'Soy sauce', 'Rice', 'Broccoli'],
    });

    render(NutritionPage);

    await screen.findByText('Recommended next');
    await fireEvent.click(screen.getByRole('button', { name: 'Plan next' }));

    await waitFor(() => {
      expect(screen.getByText(/Planned next meal saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Teriyaki Chicken Bowl').length).toBeGreaterThan(0);
    });

    const planSlots = await db.planSlots.toArray();
    expect(planSlots).toHaveLength(1);
    expect(planSlots[0]).toEqual(
      expect.objectContaining({
        itemType: 'recipe',
        itemId: 'recipe-1',
        mealType: 'dinner',
        title: 'Teriyaki Chicken Bowl',
      })
    );
    expect(
      (await db.foodCatalogItems.toArray()).find(
        (item) => item.name === 'Teriyaki Chicken Bowl' && item.sourceName === 'Local catalog'
      )
    ).toBeUndefined();
  });

  it('keeps recommendation copy truthful for saved foods whose nutrition totals are still unknown', async () => {
    const db = getTestHealthDb();
    await db.foodCatalogItems.put({
      id: 'food-catalog-1',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      name: 'Teriyaki Chicken Casserole',
      sourceType: 'custom',
      sourceName: 'Local catalog',
    });

    render(NutritionPage);

    await screen.findByText('Recommended next');
    await waitFor(() => {
      const recommendationSection = Array.from(document.querySelectorAll('section')).find(
        (section) => section.textContent?.includes('Recommended next')
      );
      expect(recommendationSection?.textContent).toContain('Teriyaki Chicken Casserole');
      expect(recommendationSection?.textContent).toContain(
        'nutrition totals are still unknown, so treat this as a saved rotation idea.'
      );
      expect(recommendationSection?.textContent).not.toContain(
        'saved food with decent baseline nutrition'
      );
      expect(recommendationSection?.textContent).not.toContain(
        'good fit for a steadier-energy day'
      );
    });
  });

  it('drops the saved-food identity once the loaded draft is manually edited before planning', async () => {
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
    });

    await fireEvent.input(screen.getByLabelText('Meal name'), {
      target: { value: 'Greek yogurt bowl remix' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Plan next meal' }));

    await waitFor(() => {
      expect(screen.getByText(/Planned next meal saved\./i)).toBeTruthy();
      expect(screen.getAllByText('Greek yogurt bowl remix').length).toBeGreaterThan(0);
    });

    const planSlots = await db.planSlots.toArray();
    expect(planSlots).toHaveLength(1);
    expect(planSlots[0]?.itemId).not.toBe('food-catalog-1');
    expect(await db.foodCatalogItems.count()).toBe(2);
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

  it('still surfaces a valid planned meal when an earlier slot is stale', async () => {
    const db = getTestHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);

    await db.foodCatalogItems.put({
      id: 'food-catalog-2',
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

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: 'missing-food',
      mealType: 'breakfast',
      title: 'Missing breakfast',
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: 'food-catalog-2',
      mealType: 'lunch',
      title: 'Greek yogurt bowl',
    });

    render(NutritionPage);

    await waitFor(() => {
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
      expect(screen.getByText(/Meal type: lunch/i)).toBeTruthy();
      expect(screen.queryByText(/Planned meal unavailable\./i)).toBeNull();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Load into draft' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe(
        'Greek yogurt bowl'
      );
      expect((screen.getByLabelText('Meal type') as HTMLSelectElement).value).toBe('lunch');
    });
  });

  it('clears stale sibling plan slots when clearing the visible planned meal', async () => {
    const db = getTestHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);

    await db.foodCatalogItems.put({
      id: 'food-catalog-2',
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

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: 'missing-food',
      mealType: 'breakfast',
      title: 'Missing breakfast',
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'food',
      itemId: 'food-catalog-2',
      mealType: 'lunch',
      title: 'Greek yogurt bowl',
    });

    render(NutritionPage);

    await waitFor(() => {
      expect(screen.getAllByText('Greek yogurt bowl').length).toBeGreaterThan(0);
      expect(screen.getByText(/Meal type: lunch/i)).toBeTruthy();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Clear plan' }));
    await waitFor(async () => {
      expect(screen.getByText(/Planned meal cleared\./i)).toBeTruthy();
      expect(screen.getByText(/Nothing planned yet\./i)).toBeTruthy();
      expect(screen.queryByText(/Planned meal unavailable\./i)).toBeNull();
      expect(await db.planSlots.count()).toBe(0);
    });
  });

  it('surfaces a planned recipe slot and can load it into the draft', async () => {
    const db = getTestHealthDb();
    const localDay = currentLocalDay();
    const weeklyPlan = await ensureWeeklyPlan(db, localDay);

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

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay,
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    render(NutritionPage);

    await waitFor(() => {
      expect(screen.getAllByText('Teriyaki Chicken Casserole').length).toBeGreaterThan(0);
      expect(screen.getByText(/Meal type: dinner/i)).toBeTruthy();
      expect(screen.queryByText(/Calories: 0/i)).toBeNull();
      expect(screen.queryByText(/Protein: 0/i)).toBeNull();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Load into draft' }));
    await waitFor(() => {
      expect((screen.getByLabelText('Meal name') as HTMLInputElement).value).toBe(
        'Teriyaki Chicken Casserole'
      );
      expect((screen.getByLabelText('Meal type') as HTMLSelectElement).value).toBe('dinner');
      expect((screen.getByLabelText('Calories') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Protein') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Fiber') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Carbs') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Fat') as HTMLInputElement).value).toBe('');
    });
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
