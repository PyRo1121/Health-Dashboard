import { describe, expect, it } from 'vitest';
import {
  createFoodCatalogItemRows,
  createNutritionDraftFromForm,
  createNutritionForm,
  createNutritionMetricRows,
  createPlannedMealRows,
  createNutritionSummaryRows,
  mergeNutritionFormWithDraft,
} from '$lib/features/nutrition/model';

describe('nutrition model', () => {
  it('derives nutrition drafts, form merges, and summary rows', () => {
    const form = mergeNutritionFormWithDraft(createNutritionForm(), {
      name: 'Oatmeal with berries',
      calories: 320,
      protein: 12,
      fiber: 8,
      carbs: 52,
      fat: 7,
    });
    const draft = createNutritionDraftFromForm(
      '2026-04-02',
      form,
      {
        id: 'fdc-oatmeal',
        name: 'Oatmeal with berries',
        calories: 320,
        protein: 12,
        fiber: 8,
        carbs: 52,
        fat: 7,
        sourceName: 'USDA fallback',
      },
      {
        kind: 'food',
        id: 'fdc-oatmeal',
        sourceName: 'USDA fallback',
      }
    );

    expect(draft).toMatchObject({
      localDay: '2026-04-02',
      calories: 320,
      carbs: 52,
      fat: 7,
      sourceName: 'USDA fallback',
    });
    expect(
      createNutritionSummaryRows({
        calories: 320,
        protein: 12,
        fiber: 8,
        carbs: 52,
        fat: 7,
        entries: [],
      })
    ).toEqual(['Calories: 320', 'Protein: 12', 'Fiber: 8', 'Carbs: 52', 'Fat: 7']);
  });

  it('starts a fresh nutrition form with blank macro inputs', () => {
    expect(createNutritionForm()).toMatchObject({
      calories: '',
      protein: '',
      fiber: '',
      carbs: '',
      fat: '',
    });
  });

  it('serializes blank nutrition fields as unknown instead of zero', () => {
    const draft = createNutritionDraftFromForm(
      '2026-04-02',
      {
        ...createNutritionForm(),
        mealType: 'dinner',
        name: 'Teriyaki Chicken Bowl',
        calories: '',
        protein: '',
        fiber: '',
        carbs: '',
        fat: '',
        notes: 'Chicken, Soy sauce, Rice, Broccoli',
      },
      null,
      {
        kind: 'recipe',
        id: 'recipe-1',
        sourceName: 'TheMealDB',
      }
    );

    expect(draft).toMatchObject({
      localDay: '2026-04-02',
      name: 'Teriyaki Chicken Bowl',
      calories: undefined,
      protein: undefined,
      fiber: undefined,
      carbs: undefined,
      fat: undefined,
      recipeCatalogItemId: 'recipe-1',
      sourceName: 'TheMealDB',
    });
  });

  it('does not render unknown custom-food or planned-meal nutrition values as zeroes', () => {
    expect(
      createFoodCatalogItemRows({
        id: 'food-catalog-1',
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
        name: 'Teriyaki Chicken Bowl',
        sourceType: 'custom',
        sourceName: 'Local catalog',
      })
    ).toEqual([]);

    expect(
      createPlannedMealRows({
        id: 'planned-slot:recipe-1',
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
        name: 'Teriyaki Chicken Bowl',
        mealType: 'dinner',
        sourceName: 'TheMealDB',
        notes: 'Chicken, Soy sauce, Rice, Broccoli',
      })
    ).toEqual(['Meal type: dinner']);

    expect(
      createNutritionMetricRows({
        calories: undefined,
        protein: undefined,
        fiber: undefined,
        carbs: undefined,
        fat: undefined,
      })
    ).toEqual([]);

    expect(
      createNutritionSummaryRows({
        calories: 0,
        protein: 0,
        fiber: 0,
        carbs: 0,
        fat: 0,
        entries: [
          {
            id: 'food-entry-1',
            createdAt: '2026-04-02T00:00:00.000Z',
            updatedAt: '2026-04-02T00:00:00.000Z',
            localDay: '2026-04-02',
            mealType: 'dinner',
            name: 'Teriyaki Chicken Bowl',
            sourceName: 'Local catalog',
          },
        ],
      })
    ).toEqual([
      'Calories: unknown',
      'Protein: unknown',
      'Fiber: unknown',
      'Carbs: unknown',
      'Fat: unknown',
    ]);
  });

  it('keeps unknown matched-food metrics blank when merging into form state', () => {
    expect(
      mergeNutritionFormWithDraft(createNutritionForm(), {
        name: 'Teriyaki Chicken Bowl',
        calories: undefined,
        protein: undefined,
        fiber: undefined,
        carbs: undefined,
        fat: undefined,
      })
    ).toMatchObject({
      name: 'Teriyaki Chicken Bowl',
      calories: '',
      protein: '',
      fiber: '',
      carbs: '',
      fat: '',
    });
  });
});
