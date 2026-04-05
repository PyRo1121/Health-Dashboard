import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
  saveFoodCatalogItem,
  savePlannedMeal,
  upsertRecipeCatalogItem,
} from '$lib/features/nutrition/service';
import {
  createPlanningPageState,
  deletePlanningSlotPage,
  loadPlanningPage,
  markPlanningSlotStatusPage,
  movePlanningSlotPage,
  savePlanningSlotPage,
  saveWorkoutTemplatePage,
  togglePlanningGroceryStatePage,
} from '$lib/features/planning/controller';

describe('planning controller', () => {
  const getDb = useTestHealthDb('planning-page-controller');

  it('loads, saves plan slots, reorders them, and updates groceries', async () => {
    const db = getDb();
    await upsertRecipeCatalogItem(db, {
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

    let state = await loadPlanningPage(db, '2026-04-07', createPlanningPageState());
    expect(state.loading).toBe(false);
    expect(state.weeklyPlan).not.toBeNull();

    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'meal',
        mealSource: 'recipe',
        recipeId: 'themealdb:52772',
      },
    });
    expect(state.planNotice).toBe('Plan slot saved.');
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0]?.title).toBe('Teriyaki Chicken Casserole');
    expect(state.groceryItems).toHaveLength(2);

    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'note',
        title: 'Stretch block',
        notes: 'Ten minutes',
      },
    });
    expect(state.slots).toHaveLength(2);

    state = await movePlanningSlotPage(db, state, state.slots[1]!.id, 'up');
    expect(state.planNotice).toBe('Plan slot moved up.');
    expect(state.slots[0]?.title).toBe('Stretch block');

    state = await markPlanningSlotStatusPage(db, state, state.slots[0]!.id, 'done');
    expect(state.planNotice).toBe('Plan slot marked done.');
    expect(state.slots[0]?.status).toBe('done');

    const groceryId = state.groceryItems[0]!.id;
    state = await togglePlanningGroceryStatePage(db, state, groceryId, {
      checked: true,
      excluded: false,
      onHand: false,
    });
    expect(state.groceryNotice).toBe('Grocery item updated.');
    expect(state.groceryItems.find((item) => item.id === groceryId)?.checked).toBe(true);

    state = await deletePlanningSlotPage(db, state, state.slots[0]!.id);
    expect(state.planNotice).toBe('Plan slot removed.');
    expect(state.slots).toHaveLength(1);
  });

  it('guards missing linked items and saves workout templates', async () => {
    const db = getDb();
    let state = await loadPlanningPage(db, '2026-04-07', createPlanningPageState());

    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'meal',
        mealSource: 'recipe',
        recipeId: '',
      },
    });
    expect(state.planNotice).toBe('Choose a recipe before adding a meal slot.');

    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'workout',
        workoutTemplateId: '',
      },
    });
    expect(state.planNotice).toBe('Choose a workout template before adding a workout slot.');

    state = await saveWorkoutTemplatePage(db, {
      ...state,
      workoutTemplateForm: {
        title: 'Full body reset',
        goal: 'Recovery',
        exercises: [{ name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 }],
      },
    });
    expect(state.workoutTemplateNotice).toBe('Workout template saved.');
    expect(state.workoutTemplates).toHaveLength(1);
    expect(state.workoutTemplateForm).toEqual({
      title: '',
      goal: '',
      exercises: [{ name: '', reps: '' }],
    });
  });

  it('surfaces stale linked-item errors for recipe, food, and workout slots', async () => {
    const db = getDb();
    let state = await loadPlanningPage(db, '2026-04-07', createPlanningPageState());

    await upsertRecipeCatalogItem(db, {
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
    state = await loadPlanningPage(db, '2026-04-07', state);
    await db.recipeCatalogItems.delete('themealdb:52772');
    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'meal',
        mealSource: 'recipe',
        recipeId: 'themealdb:52772',
      },
    });
    expect(state.planNotice).toBe(
      'That recipe no longer exists. Choose another before adding it to the week.'
    );

    const food = await saveFoodCatalogItem(db, {
      name: 'Greek yogurt bowl',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    });
    state = await loadPlanningPage(db, '2026-04-07', state);
    await db.foodCatalogItems.delete(food.id);
    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'meal',
        mealSource: 'food',
        foodCatalogItemId: food.id,
      },
    });
    expect(state.planNotice).toBe(
      'That saved food no longer exists. Choose another before adding it to the week.'
    );

    state = await saveWorkoutTemplatePage(db, {
      ...state,
      workoutTemplateForm: {
        title: 'Full body reset',
        goal: 'Recovery',
        exercises: [{ name: 'Goblet squat', sets: 3, reps: '8', restSeconds: 60 }],
      },
    });
    const workoutTemplateId = state.workoutTemplates[0]!.id;
    await db.workoutTemplates.delete(workoutTemplateId);
    state = await savePlanningSlotPage(db, {
      ...state,
      slotForm: {
        ...state.slotForm,
        localDay: '2026-04-07',
        slotType: 'workout',
        workoutTemplateId,
      },
    });
    expect(state.planNotice).toBe(
      'That workout template no longer exists. Choose another before adding it to the week.'
    );
    expect(state.slots).toHaveLength(0);
  });

  it('migrates a legacy planned meal into the weekly plan when plan loads', async () => {
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
    });

    const state = await loadPlanningPage(db, '2026-04-07', createPlanningPageState());

    expect(state.planNotice).toBe('Legacy planned meal moved into today’s weekly plan.');
    expect(state.slots).toHaveLength(1);
    expect(state.slots[0]).toMatchObject({
      slotType: 'meal',
      itemType: 'food',
      title: 'Greek yogurt bowl',
      mealType: 'breakfast',
    });
    expect(await db.plannedMeals.count()).toBe(0);
  });
});
