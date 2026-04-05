import { describe, expect, it, vi } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import * as nutritionService from '$lib/features/nutrition/service';
import {
  deriveWeeklyGroceries,
  deriveWeeklyGroceriesWithWarnings,
  removeManualGroceryItem,
  saveManualGroceryItem,
  setGroceryItemState,
} from '$lib/features/groceries/service';

describe('groceries service', () => {
  const getDb = useTestHealthDb('groceries-service');

  it('derives grocery items from planned recipe slots and keeps stable item state', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
    await nutritionService.upsertRecipeCatalogItem(db, {
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
      localDay: '2026-04-07',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    const groceries = await deriveWeeklyGroceries(db, weeklyPlan.id);

    expect(groceries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'chicken breast',
          quantityText: '2',
          aisle: 'Protein & Dairy',
          onHand: false,
        }),
        expect.objectContaining({
          label: 'soy sauce',
          quantityText: '3/4 cup',
          aisle: 'Pantry',
          onHand: false,
        }),
      ])
    );

    const updated = await setGroceryItemState(db, groceries[0]!.id, {
      checked: true,
      excluded: false,
      onHand: true,
    });
    expect(updated.checked).toBe(true);
    expect(updated.onHand).toBe(true);

    const regenerated = await deriveWeeklyGroceries(db, weeklyPlan.id);
    const preserved = regenerated.find((item) => item.id === groceries[0]!.id);
    expect(preserved).toMatchObject({
      checked: true,
      onHand: true,
    });
  });

  it('drops stale grocery items when the recipe-backed slots disappear', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
    await nutritionService.upsertRecipeCatalogItem(db, {
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

    const slot = await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-07',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    await deriveWeeklyGroceries(db, weeklyPlan.id);
    expect(await db.groceryItems.count()).toBe(1);

    await db.planSlots.delete(slot.id);
    const groceries = await deriveWeeklyGroceries(db, weeklyPlan.id);

    expect(groceries).toEqual([]);
    expect(await db.groceryItems.count()).toBe(0);
  });

  it('keeps excluded state, merges duplicate ingredients, and reports recipes with no usable ingredients', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
    await nutritionService.upsertRecipeCatalogItem(db, {
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
    await nutritionService.upsertRecipeCatalogItem(db, {
      id: 'themealdb:52773',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z',
      title: 'Soy glazed bowl',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52773',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: ['1 tbsp soy sauce'],
    });
    await nutritionService.upsertRecipeCatalogItem(db, {
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

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-07',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-08',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52773',
      title: 'Soy glazed bowl',
    });
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-09',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52774',
      title: 'Mystery bowl',
    });

    const firstPass = await deriveWeeklyGroceries(db, weeklyPlan.id);
    const soySauce = firstPass.find((item) => item.ingredientKey === 'soy sauce');
    expect(soySauce?.quantityText).toBe('3/4 cup + 1 tbsp');

    await setGroceryItemState(db, soySauce!.id, {
      checked: false,
      excluded: true,
      onHand: false,
    });

    const result = await deriveWeeklyGroceriesWithWarnings(db, weeklyPlan.id);
    const preservedSoySauce = result.items.find((item) => item.ingredientKey === 'soy sauce');

    expect(result.items).toHaveLength(2);
    expect(preservedSoySauce?.excluded).toBe(true);
    expect(result.warnings).toEqual([
      'Mystery bowl: no ingredients available for grocery generation.',
    ]);
  });

  it('reuses preloaded recipes when provided instead of fetching them again', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
    const recipes = [
      {
        id: 'themealdb:52772',
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: '2026-04-03T00:00:00.000Z',
        title: 'Teriyaki Chicken Casserole',
        sourceType: 'themealdb' as const,
        sourceName: 'TheMealDB',
        externalId: '52772',
        mealType: 'dinner' as const,
        cuisine: 'Japanese',
        ingredients: ['3/4 cup soy sauce'],
      },
    ];

    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-07',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    const listRecipeCatalogItemsSpy = vi.spyOn(nutritionService, 'listRecipeCatalogItems');

    const result = await deriveWeeklyGroceriesWithWarnings(db, weeklyPlan.id, recipes);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.label).toBe('soy sauce');
    expect(listRecipeCatalogItemsSpy).not.toHaveBeenCalled();
  });

  it('preserves manual grocery items through recipe recompute and can merge them with derived rows', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
    await nutritionService.upsertRecipeCatalogItem(db, {
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
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-07',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    await deriveWeeklyGroceries(db, weeklyPlan.id);

    const merged = await saveManualGroceryItem(db, weeklyPlan.id, {
      rawLabel: '1 bottle soy sauce',
    });
    expect(merged.manual).toBe(true);
    expect(merged.sourceRecipeIds).toEqual(['themealdb:52772']);
    expect(merged.quantityText).toBe('3/4 cup + 1 bottle');

    const manualOnly = await saveManualGroceryItem(db, weeklyPlan.id, {
      rawLabel: 'paper towels',
    });
    expect(manualOnly.manual).toBe(true);
    expect(manualOnly.sourceRecipeIds).toEqual([]);

    const regenerated = await deriveWeeklyGroceries(db, weeklyPlan.id);
    expect(regenerated.find((item) => item.ingredientKey === 'soy sauce')).toMatchObject({
      manual: true,
      quantityText: '3/4 cup + 1 bottle',
    });
    expect(regenerated.find((item) => item.ingredientKey === 'paper towels')).toMatchObject({
      manual: true,
      label: 'paper towels',
    });

    const afterManualRemoval = await removeManualGroceryItem(db, merged.id);
    expect(afterManualRemoval).toMatchObject({
      manual: false,
      quantityText: '3/4 cup',
    });

    await removeManualGroceryItem(db, manualOnly.id);
    expect(await db.groceryItems.get(manualOnly.id)).toBeUndefined();
  });
});
