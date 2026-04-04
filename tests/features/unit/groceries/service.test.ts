import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import { ensureWeeklyPlan, savePlanSlot } from '$lib/features/planning/service';
import { upsertRecipeCatalogItem } from '$lib/features/nutrition/service';
import { deriveWeeklyGroceries, setGroceryItemState } from '$lib/features/groceries/service';

describe('groceries service', () => {
	const getDb = useTestHealthDb('groceries-service');

	it('derives grocery items from planned recipe slots and keeps stable item state', async () => {
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
			ingredients: ['3/4 cup soy sauce', '2 chicken breast']
		});

		await savePlanSlot(db, {
			weeklyPlanId: weeklyPlan.id,
			localDay: '2026-04-07',
			slotType: 'meal',
			itemType: 'recipe',
			itemId: 'themealdb:52772',
			title: 'Teriyaki Chicken Casserole'
		});

		const groceries = await deriveWeeklyGroceries(db, weeklyPlan.id);

		expect(groceries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					label: 'chicken breast',
					quantityText: '2',
					aisle: 'Protein & Dairy',
					onHand: false
				}),
				expect.objectContaining({
					label: 'soy sauce',
					quantityText: '3/4 cup',
					aisle: 'Pantry',
					onHand: false
				})
			])
		);

		const updated = await setGroceryItemState(db, groceries[0]!.id, {
			checked: true,
			excluded: false,
			onHand: true
		});
		expect(updated.checked).toBe(true);
		expect(updated.onHand).toBe(true);

		const regenerated = await deriveWeeklyGroceries(db, weeklyPlan.id);
		const preserved = regenerated.find((item) => item.id === groceries[0]!.id);
		expect(preserved).toMatchObject({
			checked: true,
			onHand: true
		});
	});

	it('drops stale grocery items when the recipe-backed slots disappear', async () => {
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
			ingredients: ['3/4 cup soy sauce']
		});

		const slot = await savePlanSlot(db, {
			weeklyPlanId: weeklyPlan.id,
			localDay: '2026-04-07',
			slotType: 'meal',
			itemType: 'recipe',
			itemId: 'themealdb:52772',
			title: 'Teriyaki Chicken Casserole'
		});

		await deriveWeeklyGroceries(db, weeklyPlan.id);
		expect(await db.groceryItems.count()).toBe(1);

		await db.planSlots.delete(slot.id);
		const groceries = await deriveWeeklyGroceries(db, weeklyPlan.id);

		expect(groceries).toEqual([]);
		expect(await db.groceryItems.count()).toBe(0);
	});
});
