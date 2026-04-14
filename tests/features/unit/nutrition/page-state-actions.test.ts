import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  applyNutritionSearchMatches,
  createNutritionPageState,
  loadNutritionPage,
  runNutritionSearch,
  selectNutritionMatch,
  useNutritionRecipe,
  updateNutritionSearch,
} from '$lib/features/nutrition/state';
import {
  clearNutritionPlannedMeal,
  planNutritionMeal,
  reuseNutritionMeal,
  saveNutritionMeal,
  saveNutritionRecurringMeal,
} from '$lib/features/nutrition/actions';

describe('nutrition page state and actions', () => {
  const getDb = useTestHealthDb();

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
    expect(await db.reviewSnapshots.count()).toBe(1);

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
    expect(await db.planSlots.count()).toBe(1);
    expect(await db.adherenceMatches.count()).toBe(1);
    expect((await db.planSlots.toArray())[0]?.mealType).toBe('breakfast');

    state = await clearNutritionPlannedMeal(db, state);
    expect(state.saveNotice).toBe('Planned meal cleared.');
    expect(state.plannedMeal).toBeNull();
    expect(await db.planSlots.count()).toBe(0);
    expect(await db.reviewSnapshots.count()).toBe(1);
  });

  it('replaces multiple stale planned-food slots without resurrecting a deleted sibling', async () => {
    const db = getDb();
    await db.weeklyPlans.put({
      id: 'weekly-plan-1',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      weekStart: '2026-03-30',
      title: 'This Week',
    });
    await db.planSlots.bulkPut([
      {
        id: 'stale-slot-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weeklyPlanId: 'weekly-plan-1',
        localDay: '2026-04-02',
        slotType: 'meal',
        itemType: 'food',
        itemId: 'missing-food-1',
        mealType: 'breakfast',
        title: 'Broken breakfast',
        status: 'planned',
        order: 0,
      },
      {
        id: 'stale-slot-2',
        createdAt: '2026-04-02T08:05:00.000Z',
        updatedAt: '2026-04-02T08:05:00.000Z',
        weeklyPlanId: 'weekly-plan-1',
        localDay: '2026-04-02',
        slotType: 'meal',
        itemType: 'food',
        itemId: 'missing-food-2',
        mealType: 'lunch',
        title: 'Broken lunch',
        status: 'planned',
        order: 1,
      },
    ]);

    let state = await loadNutritionPage(db, '2026-04-02', createNutritionPageState());
    expect(state.plannedMeal).toBeNull();
    expect(state.plannedMealIssue).toBe(
      'That planned meal no longer exists. Replace it in Plan before using it.'
    );

    state = await planNutritionMeal(db, state, {
      name: 'Protein oats',
      mealType: 'breakfast',
      calories: 380,
      protein: 26,
      fiber: 7,
      carbs: 42,
      fat: 10,
      notes: 'Add cinnamon',
    });

    expect(state.saveNotice).toBe('Planned next meal saved.');
    expect(state.plannedMeal?.name).toBe('Protein oats');
    expect(state.plannedMealIssue).toBe('');

    const planSlots = await db.planSlots.toArray();
    expect(planSlots).toHaveLength(1);
    expect(planSlots[0]).toEqual(
      expect.objectContaining({
        title: 'Protein oats',
        itemType: 'food',
        mealType: 'breakfast',
        order: 0,
      })
    );
    expect(planSlots[0]?.id).not.toBe('stale-slot-1');
    expect(planSlots[0]?.id).not.toBe('stale-slot-2');
  });

  it('clears stale recipe and packaged notices when a food match is selected', () => {
    const state = selectNutritionMatch(
      {
        ...createNutritionPageState(),
        localDay: '2026-04-02',
        packagedNotice: 'Packaged food loaded from barcode.',
        recipeNotice: 'Loaded Teriyaki Chicken Bowl into the meal form.',
        form: {
          ...createNutritionPageState().form,
          notes: '3/4 cup soy sauce, 2 chicken breast, Rice',
        },
      },
      {
        id: 'food-catalog-1',
        name: 'Greek yogurt bowl',
        calories: 310,
        protein: 24,
        fiber: 6,
        carbs: 34,
        fat: 8,
        sourceName: 'Local catalog',
        sourceType: 'custom',
        isEnriched: true,
      }
    );

    expect(state.selectedMatch?.id).toBe('food-catalog-1');
    expect(state.packagedNotice).toBe('');
    expect(state.recipeNotice).toBe('');
    expect(state.form.name).toBe('Greek yogurt bowl');
    expect(state.form.notes).toBe('');
  });

  it('clears any previously selected food when a recipe is loaded into the draft', () => {
    const state = useNutritionRecipe(
      {
        ...createNutritionPageState(),
        localDay: '2026-04-02',
        searchNotice: 'USDA result enriched and cached locally.',
        packagedNotice: 'Packaged food loaded from barcode.',
        selectedMatch: {
          id: 'food-catalog-1',
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
      },
      {
        id: 'recipe-1',
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
        title: 'Teriyaki Chicken Bowl',
        sourceType: 'themealdb',
        sourceName: 'TheMealDB',
        externalId: '52772',
        mealType: 'dinner',
        cuisine: 'Japanese',
        ingredients: ['Chicken', 'Soy sauce', 'Rice', 'Broccoli'],
      }
    );

    expect(state.selectedMatch).toBeNull();
    expect(state.selectedDraftSource).toEqual({
      kind: 'recipe',
      id: 'recipe-1',
      sourceName: 'TheMealDB',
    });
    expect(state.searchNotice).toBe('');
    expect(state.packagedNotice).toBe('');
    expect(state.recipeNotice).toBe('Loaded Teriyaki Chicken Bowl into the meal form.');
    expect(state.form.mealType).toBe('dinner');
    expect(state.form.name).toBe('Teriyaki Chicken Bowl');
    expect(state.form.calories).toBe('0');
    expect(state.form.protein).toBe('0');
    expect(state.form.fiber).toBe('0');
    expect(state.form.carbs).toBe('0');
    expect(state.form.fat).toBe('0');
    expect(state.form.notes).toBe('Chicken, Soy sauce, Rice, Broccoli');
  });

  it('plans a loaded recipe as a recipe slot without cloning it into the food catalog', async () => {
    const db = getDb();
    await db.recipeCatalogItems.put({
      id: 'recipe-1',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      title: 'Teriyaki Chicken Bowl',
      sourceType: 'themealdb',
      sourceName: 'TheMealDB',
      externalId: '52772',
      mealType: 'dinner',
      cuisine: 'Japanese',
      ingredients: ['Chicken', 'Soy sauce', 'Rice', 'Broccoli'],
    });

    let state = await loadNutritionPage(db, '2026-04-02', createNutritionPageState());
    state = useNutritionRecipe(state, state.recipeCatalogItems[0]!);

    state = await planNutritionMeal(db, state, {
      name: state.form.name,
      mealType: state.form.mealType,
      calories: Number(state.form.calories),
      protein: Number(state.form.protein),
      fiber: Number(state.form.fiber),
      carbs: Number(state.form.carbs),
      fat: Number(state.form.fat),
      notes: state.form.notes,
      recipeCatalogItemId:
        state.selectedDraftSource?.kind === 'recipe' ? state.selectedDraftSource.id : undefined,
      sourceName: state.selectedDraftSource?.sourceName,
    });

    expect(state.saveNotice).toBe('Planned next meal saved.');
    expect(state.plannedMeal?.name).toBe('Teriyaki Chicken Bowl');
    expect(state.plannedMealSource).toEqual({
      kind: 'recipe',
      id: 'recipe-1',
      sourceName: 'TheMealDB',
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
});
