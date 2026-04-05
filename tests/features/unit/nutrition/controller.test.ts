import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { savePlannedMeal } from '$lib/features/nutrition/service';
import {
  applyNutritionSearchMatches,
  clearNutritionPlannedMeal,
  createNutritionPageState,
  loadNutritionPage,
  planNutritionMeal,
  reuseNutritionMeal,
  runNutritionSearch,
  saveNutritionMeal,
  saveNutritionRecurringMeal,
  selectNutritionMatch,
  updateNutritionSearch,
} from '$lib/features/nutrition/controller';

describe('nutrition controller', () => {
  const getDb = useTestHealthDb('nutrition-page-controller');

  it('loads nutrition state, runs search, saves a meal, saves recurring, and reuses it', async () => {
    const db = getDb();
    let state = await loadNutritionPage(db, '2026-04-02', createNutritionPageState());
    state = updateNutritionSearch(state, 'oatmeal');
    state = runNutritionSearch(state);
    expect(state.matches[0]?.name).toBe('Oatmeal with berries');

    state = selectNutritionMatch(state, state.matches[0]!);
    state = await saveNutritionMeal(db, state, {
      localDay: state.localDay,
      mealType: state.form.mealType,
      name: state.form.name,
      calories: Number(state.form.calories),
      protein: Number(state.form.protein),
      fiber: Number(state.form.fiber),
      carbs: Number(state.form.carbs),
      fat: Number(state.form.fat),
      notes: state.form.notes,
      sourceName: state.selectedMatch?.sourceName,
    });
    expect(state.saveNotice).toBe('Meal saved.');
    expect(state.summary.calories).toBe(320);

    state = await saveNutritionRecurringMeal(db, state, {
      name: state.form.name,
      mealType: state.form.mealType,
      calories: Number(state.form.calories),
      protein: Number(state.form.protein),
      fiber: Number(state.form.fiber),
      carbs: Number(state.form.carbs),
      fat: Number(state.form.fat),
      sourceName: state.selectedMatch?.sourceName,
    });
    expect(state.favoriteMeals).toHaveLength(1);

    state = await reuseNutritionMeal(db, state, state.favoriteMeals[0]!.id);
    expect(state.saveNotice).toBe('Recurring meal reused.');
    expect(state.summary.calories).toBe(640);

    state = await planNutritionMeal(db, state, {
      name: state.form.name,
      mealType: state.form.mealType,
      calories: Number(state.form.calories),
      protein: Number(state.form.protein),
      fiber: Number(state.form.fiber),
      carbs: Number(state.form.carbs),
      fat: Number(state.form.fat),
      notes: state.form.notes,
      foodCatalogItemId: state.selectedMatch?.id,
      sourceName: state.selectedMatch?.sourceName,
    });
    expect(state.saveNotice).toBe('Planned next meal saved.');
    expect(state.plannedMeal?.name).toBe('Oatmeal with berries');
    expect(state.plannedMealSlotId).toBeTruthy();
    expect(await db.plannedMeals.count()).toBe(0);
    expect(await db.planSlots.count()).toBe(1);
    expect((await db.planSlots.toArray())[0]?.mealType).toBe('breakfast');

    state = await clearNutritionPlannedMeal(db, state);
    expect(state.saveNotice).toBe('Planned meal cleared.');
    expect(state.plannedMeal).toBeNull();
    expect(await db.planSlots.count()).toBe(0);
  });

  it('applies USDA search results and notices explicitly', () => {
    const state = applyNutritionSearchMatches(
      createNutritionPageState(),
      [
        {
          id: 'usda-search:12345',
          externalId: '12345',
          name: 'Chicken breast, roasted',
          calories: 0,
          protein: 0,
          fiber: 0,
          carbs: 0,
          fat: 0,
          sourceName: 'USDA FoodData Central',
          sourceType: 'usda-fallback',
          isEnriched: false,
        },
      ],
      'USDA live search unavailable, using local fallback foods.'
    );

    expect(state.matches).toHaveLength(1);
    expect(state.searchNotice).toMatch(/USDA live search unavailable/i);
  });

  it('migrates a legacy planned meal into a canonical plan slot on load', async () => {
    const db = getDb();

    await savePlannedMeal(db, {
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
      sourceName: 'Legacy planner',
      notes: 'Keep berries in the bowl.',
    });

    const state = await loadNutritionPage(db, '2026-04-02', createNutritionPageState());

    expect(state.plannedMeal?.name).toBe('Greek yogurt bowl');
    expect(state.plannedMealCompatibilityNotice).toBe('');
    expect(state.plannedMealSlotId).toBeTruthy();
    expect(state.saveNotice).toBe('Legacy planned meal moved into today’s weekly plan.');
    expect(await db.plannedMeals.count()).toBe(0);
    expect(await db.planSlots.count()).toBe(1);
    expect((await db.planSlots.toArray())[0]).toMatchObject({
      slotType: 'meal',
      itemType: 'food',
      mealType: 'breakfast',
      title: 'Greek yogurt bowl',
    });
  });
});
