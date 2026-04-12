import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { upsertRecipeCatalogItem } from '$lib/features/nutrition/store';
import {
  addManualGroceryItemPage,
  createGroceriesPageState,
  loadGroceriesPage,
  removeManualGroceryItemPage,
  toggleGroceryItemPage,
} from '$lib/features/groceries/controller';

describe('groceries controller', () => {
  const getDb = useTestHealthDb();

  it('loads and updates the grocery checklist for the current plan week', async () => {
    const db = getDb();
    const weeklyPlan = await ensureWeeklyPlan(db, '2026-04-07');
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
    await savePlanSlot(db, {
      weeklyPlanId: weeklyPlan.id,
      localDay: '2026-04-07',
      slotType: 'meal',
      itemType: 'recipe',
      itemId: 'themealdb:52772',
      title: 'Teriyaki Chicken Casserole',
    });

    let state = await loadGroceriesPage(db, '2026-04-07');
    expect(state.loading).toBe(false);
    expect(state.weeklyPlan?.id).toBe(weeklyPlan.id);
    expect(state.groceryItems).toHaveLength(2);

    state = await toggleGroceryItemPage(db, state, state.groceryItems[0]!.id, {
      checked: true,
      excluded: false,
      onHand: true,
    });
    expect(state.saveNotice).toBe('Grocery item updated.');
    expect(state.groceryItems[0]).toMatchObject({
      checked: true,
      onHand: true,
    });
    expect(await db.reviewSnapshots.count()).toBe(1);
    expect(createGroceriesPageState()).toMatchObject({
      loading: true,
      groceryItems: [],
      groceryWarnings: [],
    });
  });

  it('adds and removes a manual grocery item for the current week', async () => {
    const db = getDb();
    let state = await loadGroceriesPage(db, '2026-04-07');

    state = await addManualGroceryItemPage(db, state, {
      label: 'Paper towels',
      quantityText: '',
    });
    expect(state.saveNotice).toBe('Manual grocery item added.');
    expect(state.groceryItems.find((item) => item.ingredientKey === 'paper towels')).toMatchObject({
      manual: true,
      label: 'Paper towels',
    });
    expect(await db.reviewSnapshots.count()).toBe(1);

    const itemId = state.groceryItems.find((item) => item.ingredientKey === 'paper towels')!.id;
    state = await removeManualGroceryItemPage(db, state, itemId);
    expect(state.saveNotice).toBe('Manual grocery item removed.');
    expect(
      state.groceryItems.find((item) => item.ingredientKey === 'paper towels')
    ).toBeUndefined();
    expect(await db.reviewSnapshots.count()).toBe(1);
  });
});
