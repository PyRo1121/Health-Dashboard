import { afterEach, describe, expect, it, vi } from 'vitest';

function createNutritionRouteState() {
  return {
    loading: false,
    localDay: '2026-04-04',
    saveNotice: '',
    searchNotice: '',
    packagedNotice: '',
    recipeNotice: '',
    summary: { calories: 0, protein: 0, fiber: 0, carbs: 0, fat: 0, entries: [] },
    favoriteMeals: [], catalogItems: [], recipeCatalogItems: [], plannedMeal: null, plannedMealIssue: '', plannedMealSlotId: null,
    searchQuery: '', matches: [], packagedQuery: '', barcodeQuery: '', packagedMatches: [], recipeQuery: '', recipeMatches: [], selectedMatch: null,
    form: { mealType: 'breakfast', name: '', calories: '0', protein: '0', fiber: '0', carbs: '0', fat: '0', notes: '' },
    recommendationContext: { anxietyCount: 0, symptomCount: 0 },
  };
}

describe('nutrition route', () => {
  afterEach(() => {
    vi.doUnmock('$lib/server/nutrition/service');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function importRoute(overrides: {
    loadNutritionPageServer?: ReturnType<typeof vi.fn>;
    saveNutritionMealServer?: ReturnType<typeof vi.fn>;
    planNutritionMealServer?: ReturnType<typeof vi.fn>;
    saveNutritionRecurringMealServer?: ReturnType<typeof vi.fn>;
    saveNutritionCatalogItemServer?: ReturnType<typeof vi.fn>;
    clearNutritionPlannedMealServer?: ReturnType<typeof vi.fn>;
    reuseNutritionMealServer?: ReturnType<typeof vi.fn>;
  }) {
    const pageState = createNutritionRouteState();
    vi.doMock('$lib/server/nutrition/service', () => ({
      loadNutritionPageServer: overrides.loadNutritionPageServer ?? vi.fn(async () => pageState),
      saveNutritionMealServer: overrides.saveNutritionMealServer ?? vi.fn(async () => ({ ...pageState, saveNotice: 'Meal saved.' })),
      planNutritionMealServer: overrides.planNutritionMealServer ?? vi.fn(async () => ({ ...pageState, saveNotice: 'Planned next meal saved.' })),
      saveNutritionRecurringMealServer: overrides.saveNutritionRecurringMealServer ?? vi.fn(async () => ({ ...pageState, saveNotice: 'Recurring meal saved.' })),
      saveNutritionCatalogItemServer: overrides.saveNutritionCatalogItemServer ?? vi.fn(async () => ({ ...pageState, saveNotice: 'Saved to custom food catalog.' })),
      clearNutritionPlannedMealServer: overrides.clearNutritionPlannedMealServer ?? vi.fn(async () => ({ ...pageState, saveNotice: 'Planned meal cleared.' })),
      reuseNutritionMealServer: overrides.reuseNutritionMealServer ?? vi.fn(async () => ({ ...pageState, saveNotice: 'Recurring meal reused.' })),
      searchPackagedFoodsServer: vi.fn(),
      searchUsdaFoodsServer: vi.fn(),
      searchRecipesServer: vi.fn(),
      lookupNutritionBarcodeServer: vi.fn(),
      enrichNutritionFoodServer: vi.fn(),
    }));
    return { pageState, route: await import('../../../../src/routes/api/nutrition/+server.ts') };
  }

  it('loads nutrition page state through the server route', async () => {
    const loadNutritionPageServer = vi.fn(async () => createNutritionRouteState());
    const { pageState, route: { POST } } = await importRoute({ loadNutritionPageServer });
    const response = await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'load', localDay: '2026-04-04', state: pageState }) }) } as Parameters<typeof POST>[0]);
    expect(await response.json()).toEqual(expect.objectContaining({ localDay: '2026-04-04', loading: false }));
    expect(loadNutritionPageServer).toHaveBeenCalledWith('2026-04-04', pageState);
  });

  it('dispatches nutrition write actions through the server route', async () => {
    const { pageState, route: { POST } } = await importRoute({});
    expect(await (await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'saveMeal', state: pageState, draft: { localDay: '2026-04-04', mealType: 'breakfast', name: 'Greek yogurt bowl', calories: 310, protein: 24, fiber: 6, carbs: 34, fat: 8, notes: '' } }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Meal saved.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'saveCatalogItem', state: pageState, draft: { name: 'Greek yogurt bowl', calories: 310, protein: 24, fiber: 6, carbs: 34, fat: 8 } }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Saved to custom food catalog.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'planMeal', state: pageState, draft: { mealType: 'breakfast', name: 'Greek yogurt bowl', calories: 310, protein: 24, fiber: 6, carbs: 34, fat: 8, notes: '', foodCatalogItemId: 'food-1' } }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Planned next meal saved.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'saveRecurringMeal', state: pageState, draft: { mealType: 'breakfast', name: 'Greek yogurt bowl', calories: 310, protein: 24, fiber: 6, carbs: 34, fat: 8 } }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Recurring meal saved.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'clearPlannedMeal', state: pageState }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Planned meal cleared.' }));
    expect(await (await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'reuseMeal', state: pageState, favoriteMealId: 'favorite-1' }) }) } as Parameters<typeof POST>[0])).json()).toEqual(expect.objectContaining({ saveNotice: 'Recurring meal reused.' }));
  });

  it('returns 400 for invalid nutrition action payloads', async () => {
    const { route: { POST } } = await importRoute({});
    const response = await POST({ request: new Request('http://health.test/api/nutrition', { method: 'POST', body: JSON.stringify({ action: 'planMeal', localDay: '2026-04-04' }) }) } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Invalid nutrition request payload.');
  });
});
