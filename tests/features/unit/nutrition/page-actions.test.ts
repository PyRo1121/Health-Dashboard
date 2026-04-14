import { describe, expect, it, vi } from 'vitest';
import type { RecipeCatalogItem } from '$lib/core/domain/types';
import { createNutritionPageState, type NutritionPageState } from '$lib/features/nutrition/state';
import {
  applyNutritionRecommendationSelection,
  getNutritionRecommendationPlanDraft,
  loadPlannedMealIntoDraft,
  updateNutritionFormField,
} from '$lib/features/nutrition/page-actions';

function createState(overrides: Partial<NutritionPageState> = {}): NutritionPageState {
  return {
    ...createNutritionPageState(),
    loading: false,
    localDay: '2026-04-14',
    form: {
      mealType: 'breakfast',
      name: 'Draft meal',
      calories: '120',
      protein: '10',
      fiber: '4',
      carbs: '12',
      fat: '3',
      notes: 'Current draft notes',
    },
    ...overrides,
  };
}

function createRecipe(overrides: Partial<RecipeCatalogItem> = {}): RecipeCatalogItem {
  return {
    id: 'recipe-1',
    createdAt: '2026-04-14T00:00:00.000Z',
    updatedAt: '2026-04-14T00:00:00.000Z',
    title: 'Teriyaki Chicken Bowl',
    sourceType: 'themealdb',
    sourceName: 'TheMealDB',
    externalId: '52772',
    mealType: 'dinner',
    cuisine: 'Japanese',
    ingredients: ['Chicken', 'Soy sauce', 'Rice', 'Broccoli', 'Sesame oil'],
    ...overrides,
  };
}

describe('nutrition page actions', () => {
  it('loads the planned meal into the draft and clears the selected match', () => {
    const state = createState({
      selectedMatch: {
        id: 'food-1',
        name: 'Greek yogurt bowl',
        calories: 310,
        protein: 24,
        fiber: 6,
        carbs: 34,
        fat: 8,
        sourceName: 'Local catalog',
      },
      plannedMealSource: {
        kind: 'recipe',
        id: 'recipe-1',
        sourceName: 'TheMealDB',
      },
      plannedMeal: {
        id: 'planned-1',
        createdAt: '2026-04-14T00:00:00.000Z',
        updatedAt: '2026-04-14T00:00:00.000Z',
        mealType: 'lunch',
        name: 'Protein oats',
        calories: 380,
        protein: 26,
        fiber: 7,
        carbs: 42,
        fat: 10,
        notes: 'Add cinnamon',
      },
    });

    const next = loadPlannedMealIntoDraft(state);

    expect(next.selectedMatch).toBeNull();
    expect(next.selectedDraftSource).toEqual(state.plannedMealSource);
    expect(next.saveNotice).toBe('Planned meal loaded into draft.');
    expect(next.form).toMatchObject({
      mealType: 'lunch',
      name: 'Protein oats',
      calories: '380',
      protein: '26',
      fiber: '7',
      carbs: '42',
      fat: '10',
      notes: 'Add cinnamon',
    });
  });

  it('leaves unknown planned-recipe nutrition totals blank when loading the draft', () => {
    const state = createState({
      plannedMealSource: {
        kind: 'recipe',
        id: 'recipe-1',
        sourceName: 'TheMealDB',
      },
      plannedMeal: {
        id: 'planned-1',
        createdAt: '2026-04-14T00:00:00.000Z',
        updatedAt: '2026-04-14T00:00:00.000Z',
        mealType: 'dinner',
        name: 'Teriyaki Chicken Bowl',
        notes: 'Chicken, Soy sauce, Rice, Broccoli',
        sourceName: 'TheMealDB',
      },
    });

    const next = loadPlannedMealIntoDraft(state);

    expect(next.selectedDraftSource).toEqual(state.plannedMealSource);
    expect(next.form).toMatchObject({
      mealType: 'dinner',
      name: 'Teriyaki Chicken Bowl',
      calories: '',
      protein: '',
      fiber: '',
      carbs: '',
      fat: '',
      notes: 'Chicken, Soy sauce, Rice, Broccoli',
    });
  });

  it('leaves the state untouched when there is no planned meal to load', () => {
    const state = createState({ plannedMeal: null });

    expect(loadPlannedMealIntoDraft(state)).toBe(state);
  });

  it('updates only the targeted nutrition form field', () => {
    const state = createState();

    const next = updateNutritionFormField(state, 'protein', '28');

    expect(next.form.protein).toBe('28');
    expect(next.form.mealType).toBe('breakfast');
    expect(next.form.name).toBe('Draft meal');
    expect(state.form.protein).toBe('10');
  });

  it('clears the selected food identity when core nutrition fields diverge from the loaded match', () => {
    const state = createState({
      selectedMatch: {
        id: 'food-1',
        name: 'Greek yogurt bowl',
        calories: 310,
        protein: 24,
        fiber: 6,
        carbs: 34,
        fat: 8,
        sourceName: 'Local catalog',
        sourceType: 'custom',
        isEnriched: true,
      },
      selectedDraftSource: {
        kind: 'food',
        id: 'food-1',
        sourceName: 'Local catalog',
      },
    });

    const renamed = updateNutritionFormField(state, 'name', 'Greek yogurt bowl remix');
    expect(renamed.selectedMatch).toBeNull();
    expect(renamed.selectedDraftSource).toBeNull();
    expect(renamed.form.name).toBe('Greek yogurt bowl remix');

    const notesOnly = updateNutritionFormField(state, 'notes', 'Add cinnamon');
    expect(notesOnly.selectedMatch).toEqual(state.selectedMatch);
    expect(notesOnly.selectedDraftSource).toEqual(state.selectedDraftSource);
    expect(notesOnly.form.notes).toBe('Add cinnamon');
  });

  it('builds planning drafts for both saved foods and recipes', () => {
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
      recipeCatalogItems: [createRecipe()],
    });

    expect(getNutritionRecommendationPlanDraft(state, 'food-1', 'food')).toEqual({
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
      notes: '',
      foodCatalogItemId: 'food-1',
      sourceName: 'Local catalog',
    });

    expect(getNutritionRecommendationPlanDraft(state, 'recipe-1', 'recipe')).toEqual({
      name: 'Teriyaki Chicken Bowl',
      mealType: 'dinner',
      calories: 0,
      protein: 0,
      fiber: 0,
      carbs: 0,
      fat: 0,
      notes: 'Chicken, Soy sauce, Rice, Broccoli',
      recipeCatalogItemId: 'recipe-1',
      sourceName: 'TheMealDB',
    });
  });

  it('hydrates saved-food recommendations through the provided async matcher', async () => {
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
        calories: '310',
        protein: '24',
        fiber: '6',
        carbs: '34',
        fat: '8',
      },
    });
    const hydrateFoodMatch = vi.fn(async () => hydratedState);
    const applyRecipe = vi.fn();

    const next = await applyNutritionRecommendationSelection(
      state,
      'food-1',
      'food',
      hydrateFoodMatch,
      applyRecipe
    );

    expect(next).toBe(hydratedState);
    expect(hydrateFoodMatch).toHaveBeenCalledWith(
      state,
      expect.objectContaining({
        id: 'food-1',
        name: 'Greek yogurt bowl',
        calories: 310,
        protein: 24,
        fiber: 6,
        carbs: 34,
        fat: 8,
        sourceName: 'Local catalog',
        sourceType: 'custom',
        isEnriched: true,
      })
    );
    expect(applyRecipe).not.toHaveBeenCalled();
  });

  it('applies recipe recommendations synchronously and leaves state unchanged for missing ids', async () => {
    const recipe = createRecipe({ mealType: undefined });
    const state = createState({ recipeCatalogItems: [recipe] });
    const recipeState = createState({ form: { ...state.form, name: recipe.title } });
    const hydrateFoodMatch = vi.fn();
    const applyRecipe = vi.fn(() => recipeState);

    const next = await applyNutritionRecommendationSelection(
      state,
      recipe.id,
      'recipe',
      hydrateFoodMatch,
      applyRecipe
    );

    expect(next).toBe(recipeState);
    expect(applyRecipe).toHaveBeenCalledWith(state, recipe);
    expect(hydrateFoodMatch).not.toHaveBeenCalled();

    const missing = await applyNutritionRecommendationSelection(
      state,
      'missing-recipe',
      'recipe',
      hydrateFoodMatch,
      applyRecipe
    );

    expect(missing).toBe(state);
  });
});
