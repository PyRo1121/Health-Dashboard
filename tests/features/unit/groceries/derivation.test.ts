import { describe, expect, it } from 'vitest';
import type { DerivedGroceryItem, ManualGroceryItem } from '$lib/core/domain/types';
import {
  buildManualGroceryItemRecord,
  buildMergedGroceryItem,
  buildMergedWeeklyGroceries,
  inferAisle,
  parseIngredientLine,
  parseMergedGroceryItemId,
} from '$lib/features/groceries/derivation';

describe('groceries derivation helpers', () => {
  it('parses ingredient lines into stable keys and quantity text', () => {
    expect(parseIngredientLine('3/4 cup soy sauce')).toEqual({
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '3/4 cup',
    });

    expect(parseIngredientLine('2 chicken breast')).toEqual({
      ingredientKey: 'chicken breast',
      label: 'chicken breast',
      quantityText: '2',
    });

    expect(parseIngredientLine('  baby spinach  ')).toEqual({
      ingredientKey: 'baby spinach',
      label: 'baby spinach',
      quantityText: undefined,
    });

    expect(parseIngredientLine('cup noodles')).toEqual({
      ingredientKey: 'cup noodles',
      label: 'cup noodles',
      quantityText: undefined,
    });

    expect(parseIngredientLine('bottle brush')).toEqual({
      ingredientKey: 'bottle brush',
      label: 'bottle brush',
      quantityText: undefined,
    });

    expect(parseIngredientLine('1 bottle soy sauce')).toEqual({
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '1 bottle',
    });
  });

  it('infers aisles and preserves manual state when building manual records', () => {
    const existingDerived: DerivedGroceryItem = {
      id: 'derived-grocery:week-1:soy sauce',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      weeklyPlanId: 'week-1',
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '3/4 cup',
      aisle: 'Pantry',
      checked: false,
      excluded: false,
      onHand: false,
      sourceRecipeIds: ['recipe-1'],
    };

    const existingManual: ManualGroceryItem = {
      id: 'manual-grocery:week-1:soy sauce',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      weeklyPlanId: 'week-1',
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '1 bottle',
      aisle: 'Pantry',
      checked: true,
      excluded: false,
      onHand: true,
    };

    const rebuilt = buildManualGroceryItemRecord({
      weeklyPlanId: 'week-1',
      parsed: parseIngredientLine('1 bottle soy sauce'),
      existingManual,
      existingDerived,
      timestamp: '2026-04-03T00:00:00.000Z',
    });

    expect(rebuilt).toMatchObject({
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '1 bottle',
      aisle: 'Pantry',
      checked: true,
      onHand: true,
    });
    expect(inferAisle('Greek yogurt bowl')).toBe('Protein & Dairy');
    expect(inferAisle('black pepper')).toBe('Pantry');
    expect(inferAisle('pepper flakes')).toBe('Pantry');
  });

  it('merges derived and manual grocery rows into stable combined items', () => {
    const derived: DerivedGroceryItem = {
      id: 'derived-grocery:week-1:soy sauce',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      weeklyPlanId: 'week-1',
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '3/4 cup',
      aisle: 'Pantry',
      checked: false,
      excluded: false,
      onHand: false,
      sourceRecipeIds: ['recipe-1'],
    };
    const manual: ManualGroceryItem = {
      id: 'manual-grocery:week-1:soy sauce',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      weeklyPlanId: 'week-1',
      ingredientKey: 'soy sauce',
      label: 'soy sauce',
      quantityText: '1 bottle',
      aisle: 'Pantry',
      checked: true,
      excluded: true,
      onHand: true,
    };

    expect(buildMergedGroceryItem('week-1', 'soy sauce', derived, manual)).toMatchObject({
      id: 'grocery:week-1:soy sauce',
      quantityText: '3/4 cup + 1 bottle',
      manual: true,
      checked: true,
      excluded: true,
      onHand: true,
      sourceRecipeIds: ['recipe-1'],
    });

    expect(buildMergedWeeklyGroceries('week-1', [derived], [manual])).toHaveLength(1);
    expect(parseMergedGroceryItemId('grocery:week-1:soy sauce')).toEqual({
      weeklyPlanId: 'week-1',
      ingredientKey: 'soy sauce',
    });
  });
});
