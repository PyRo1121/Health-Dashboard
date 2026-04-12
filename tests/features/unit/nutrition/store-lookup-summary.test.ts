import { describe, expect, it } from 'vitest';
import {
  createFoodEntry,
  listFoodCatalogItems,
  listFavoriteMeals,
  reuseRecurringMeal,
  saveFoodCatalogItem,
  saveFavoriteMeal,
} from '$lib/features/nutrition/store';
import {
  attachNutrientsToFoodEntry,
  findFoodCatalogItemByBarcode,
  searchPackagedFoodCatalog,
  searchFoodData,
} from '$lib/features/nutrition/lookup';
import { buildDailyNutritionSummary } from '$lib/features/nutrition/summary';
import { useTestHealthDb } from '../../../support/unit/testDb';

describe('nutrition store, lookup, and summary', () => {
  const getDb = useTestHealthDb();

  it('searches fallback food data and attaches nutrients', () => {
    const [match] = searchFoodData('oatmeal');
    expect(match?.name).toMatch(/Oatmeal/);

    const draft = attachNutrientsToFoodEntry(
      { localDay: '2026-04-02', mealType: 'breakfast', name: 'temp' },
      match
    );
    expect(draft.calories).toBeGreaterThan(0);
    expect(draft.protein).toBeGreaterThan(0);
  });

  it('saves custom foods and searches them ahead of fallback matches', async () => {
    const db = getDb();
    await saveFoodCatalogItem(db, {
      name: 'Oatmeal with berries',
      calories: 350,
      protein: 15,
      fiber: 10,
    });

    const catalogItems = await listFoodCatalogItems(db);
    const matches = searchFoodData('oatmeal', catalogItems);

    expect(catalogItems).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      name: 'Oatmeal with berries',
      sourceName: 'Local catalog',
      calories: 350,
      carbs: 0,
      fat: 0,
    });
    expect(matches[1]?.sourceName).toBe('USDA fallback');
  });

  it('searches packaged foods and barcode hits from the local catalog only', async () => {
    const db = getDb();
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

    const catalogItems = await listFoodCatalogItems(db);
    const packagedMatches = searchPackagedFoodCatalog('cola', catalogItems);
    const barcodeMatch = findFoodCatalogItemByBarcode('049000028911', catalogItems);

    expect(packagedMatches).toHaveLength(1);
    expect(packagedMatches[0]?.sourceType).toBe('open-food-facts');
    expect(barcodeMatch?.name).toBe('Diet Cola');
  });

  it('reuses a recurring meal into a new day', async () => {
    const db = getDb();
    const favorite = await saveFavoriteMeal(db, {
      name: 'Quick oats',
      mealType: 'breakfast',
      items: [
        { name: 'Oatmeal with berries', calories: 320, protein: 12, fiber: 8, carbs: 52, fat: 7 },
      ],
    });

    const catalogItem = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 290,
      protein: 22,
      fiber: 5,
      carbs: 31,
      fat: 8,
    });
    expect(catalogItem.carbs).toBe(31);
    expect(catalogItem.fat).toBe(8);

    const reused = await reuseRecurringMeal(db, {
      favoriteMealId: favorite.id,
      localDay: '2026-04-02',
    });
    expect(reused).toHaveLength(1);
    expect(reused[0]?.favoriteMealId).toBe(favorite.id);
  });

  it('builds a daily nutrition summary', async () => {
    const db = getDb();
    await createFoodEntry(db, {
      localDay: '2026-04-02',
      mealType: 'breakfast',
      name: 'Oatmeal with berries',
      calories: 320,
      protein: 12,
      fiber: 8,
      carbs: 52,
      fat: 7,
    });
    await createFoodEntry(db, {
      localDay: '2026-04-02',
      mealType: 'lunch',
      name: 'Grilled chicken salad',
      calories: 410,
      protein: 36,
      fiber: 7,
      carbs: 18,
      fat: 19,
    });

    const summary = await buildDailyNutritionSummary(db, '2026-04-02');
    expect(summary.calories).toBe(730);
    expect(summary.protein).toBe(48);
    expect(summary.fiber).toBe(15);
    expect(summary.carbs).toBe(70);
    expect(summary.fat).toBe(26);
  });

  it('lists favorite meals newest first', async () => {
    const db = getDb();
    await saveFavoriteMeal(db, {
      name: 'Meal A',
      mealType: 'breakfast',
      items: [{ name: 'Oatmeal with berries' }],
    });
    await saveFavoriteMeal(db, {
      name: 'Meal B',
      mealType: 'lunch',
      items: [{ name: 'Grilled chicken salad' }],
    });

    const meals = await listFavoriteMeals(db);
    expect(meals).toHaveLength(2);
    expect(meals[0]?.name).toBe('Meal B');
  });
});
