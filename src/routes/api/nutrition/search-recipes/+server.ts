import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import { listRecipeCatalogItems, upsertRecipeCatalogItem } from '$lib/features/nutrition/service';
import { searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';

export async function POST({ request }) {
	const { query } = (await request.json()) as { query?: string };
	const normalizedQuery = query?.trim() ?? '';

	if (!normalizedQuery) {
		return json([]);
	}

	return json(
		await withServerHealthDb(async (db) => {
			const localMatches = (await listRecipeCatalogItems(db)).filter((recipe) =>
				recipe.title.toLowerCase().includes(normalizedQuery.toLowerCase())
			);
			const remoteMatches = await searchThemealdbRecipes(normalizedQuery);
			const cachedRemoteMatches = await Promise.all(
				remoteMatches.map((recipe) => upsertRecipeCatalogItem(db, recipe))
			);

			const deduped = new Map<string, (typeof cachedRemoteMatches)[number]>();
			for (const recipe of [...localMatches, ...cachedRemoteMatches]) {
				deduped.set(recipe.id, recipe);
			}

			return [...deduped.values()];
		})
	);
}
