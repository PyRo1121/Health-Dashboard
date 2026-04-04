import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import { upsertExerciseCatalogItems } from '$lib/features/movement/service';
import { searchWgerExercises } from '$lib/server/movement/wger';

export async function POST({ request }) {
	const body = (await request.json()) as { query?: string };
	const query = body.query?.trim() ?? '';

	if (!query) {
		return json([]);
	}

	const results = await searchWgerExercises(query);
	return json(
		await withServerHealthDb(async (db) => {
			return await upsertExerciseCatalogItems(db, results);
		})
	);
}
