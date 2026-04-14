import { describe, expect, it, vi } from 'vitest';
import type { NutritionPageState } from '$lib/features/nutrition/state';
import { createNutritionPageState } from '$lib/features/nutrition/state';
import { applyPendingNutritionIntent } from '$lib/features/nutrition/page-intent';

function createState(overrides: Partial<NutritionPageState> = {}): NutritionPageState {
  return {
    ...createNutritionPageState(),
    loading: false,
    localDay: '2026-04-14',
    ...overrides,
  };
}

function createIntentWindow(search: string, hash = '#draft') {
  const replaceState = vi.fn();

  return {
    location: {
      pathname: '/nutrition',
      search,
      hash,
    } as Location,
    history: {
      state: { from: 'test' },
      replaceState,
    } as Pick<History, 'state' | 'replaceState'> as History,
    replaceState,
  };
}

describe('nutrition page intent hydration', () => {
  it('returns the original state when there is no nutrition intent in the url', async () => {
    const state = createState();
    const intentWindow = createIntentWindow('?foo=1');
    const hydrateFoodMatch = vi.fn();

    const next = await applyPendingNutritionIntent(state, intentWindow, {
      hydrateFoodMatch,
      applyRecipe: vi.fn(),
    });

    expect(next).toBe(state);
    expect(intentWindow.replaceState).not.toHaveBeenCalled();
    expect(hydrateFoodMatch).not.toHaveBeenCalled();
  });

  it('hydrates saved-food intents, clears only the nutrition params, and adds the review notice', async () => {
    const state = createState({
      catalogItems: [
        {
          id: 'food-1',
          createdAt: '2026-04-14T00:00:00.000Z',
          updatedAt: '2026-04-14T00:00:00.000Z',
          name: 'Greek yogurt bowl',
          sourceType: 'custom',
          sourceName: 'Local catalog',
          calories: 310,
          protein: 24,
          fiber: 6,
          carbs: 34,
          fat: 8,
        },
      ],
    });
    const hydratedState = createState({
      form: {
        ...state.form,
        name: 'Greek yogurt bowl',
      },
    });
    const intentWindow = createIntentWindow('?foo=1&loadKind=food&loadId=food-1');
    const hydrateFoodMatch = vi.fn(async () => hydratedState);

    const next = await applyPendingNutritionIntent(state, intentWindow, {
      hydrateFoodMatch,
      applyRecipe: vi.fn(),
    });

    expect(next).toEqual({
      ...hydratedState,
      searchNotice: 'Loaded from Review strategy.',
    });
    expect(hydrateFoodMatch).toHaveBeenCalledWith(
      state,
      expect.objectContaining({
        id: 'food-1',
        name: 'Greek yogurt bowl',
        sourceName: 'Local catalog',
        isEnriched: true,
      })
    );
    expect(intentWindow.replaceState).toHaveBeenCalledWith(
      intentWindow.history.state,
      '',
      '/nutrition?foo=1#draft'
    );
  });

  it('surfaces a stable notice when the saved-food intent no longer resolves', async () => {
    const state = createState();
    const intentWindow = createIntentWindow('?loadKind=food&loadId=missing-food');
    const hydrateFoodMatch = vi.fn();

    const next = await applyPendingNutritionIntent(state, intentWindow, {
      hydrateFoodMatch,
      applyRecipe: vi.fn(),
    });

    expect(next.searchNotice).toBe('That saved food is no longer available in your local catalog.');
    expect(hydrateFoodMatch).not.toHaveBeenCalled();
    expect(intentWindow.replaceState).toHaveBeenCalledWith(
      intentWindow.history.state,
      '',
      '/nutrition#draft'
    );
  });

  it('hydrates saved-recipe intents and preserves the review notice on the recipe path', async () => {
    const state = createState({
      recipeCatalogItems: [
        {
          id: 'recipe-1',
          createdAt: '2026-04-14T00:00:00.000Z',
          updatedAt: '2026-04-14T00:00:00.000Z',
          title: 'Teriyaki Chicken Bowl',
          sourceType: 'themealdb',
          sourceName: 'TheMealDB',
          externalId: '52772',
          mealType: 'dinner',
          cuisine: 'Japanese',
          ingredients: ['Chicken', 'Soy sauce', 'Rice', 'Broccoli'],
        },
      ],
    });
    const intentWindow = createIntentWindow('?loadKind=recipe&loadId=recipe-1', '#composer');

    const applyRecipe = vi.fn((pageState, recipe) => ({
      ...pageState,
      form: {
        ...pageState.form,
        name: recipe.title,
        notes: recipe.ingredients.slice(0, 4).join(', '),
      },
    }));

    const next = await applyPendingNutritionIntent(state, intentWindow, {
      hydrateFoodMatch: vi.fn(),
      applyRecipe,
    });

    expect(next.recipeNotice).toBe('Loaded from Review strategy.');
    expect(next.form.name).toBe('Teriyaki Chicken Bowl');
    expect(next.form.notes).toBe('Chicken, Soy sauce, Rice, Broccoli');
    expect(applyRecipe).toHaveBeenCalledWith(state, state.recipeCatalogItems[0]);
    expect(intentWindow.replaceState).toHaveBeenCalledWith(
      intentWindow.history.state,
      '',
      '/nutrition#composer'
    );
  });

  it('surfaces a stable notice when the saved-recipe intent no longer resolves', async () => {
    const state = createState();
    const intentWindow = createIntentWindow('?loadKind=recipe&loadId=missing-recipe');

    const next = await applyPendingNutritionIntent(state, intentWindow, {
      hydrateFoodMatch: vi.fn(),
      applyRecipe: vi.fn(),
    });

    expect(next.recipeNotice).toBe('That saved recipe is no longer available in your local cache.');
    expect(intentWindow.replaceState).toHaveBeenCalled();
  });
});
