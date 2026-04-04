import { describe, expect, it } from 'vitest';
import { useTestHealthDb } from '../../../support/unit/testDb';
import {
	searchExerciseCatalog,
	upsertExerciseCatalogItems
} from '$lib/features/movement/service';

describe('movement service', () => {
	const getDb = useTestHealthDb('movement-service');

	it('stores and searches cached exercise catalog items', async () => {
		const db = getDb();
		await upsertExerciseCatalogItems(db, [
			{
				id: 'wger:1',
				createdAt: '2026-04-03T00:00:00.000Z',
				updatedAt: '2026-04-03T00:00:00.000Z',
				sourceType: 'wger',
				externalId: '1',
				title: 'Goblet squat',
				muscleGroups: ['Quadriceps'],
				equipment: ['Dumbbell'],
				instructions: 'Stand tall and squat deep.'
			}
		]);

		const items = await db.exerciseCatalogItems.toArray();
		expect(searchExerciseCatalog('squat', items)).toEqual([
			expect.objectContaining({
				title: 'Goblet squat'
			})
		]);
	});
});

