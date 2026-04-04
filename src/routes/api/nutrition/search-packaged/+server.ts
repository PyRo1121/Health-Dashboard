import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import {
	listFoodCatalogItems,
	searchPackagedFoodCatalog,
	type FoodLookupResult,
	upsertFoodCatalogItem
} from '$lib/features/nutrition/service';
import {
	normalizeOpenFoodFactsProduct,
	searchOpenFoodFactsProducts
} from '$lib/server/nutrition/open-food-facts';

export async function POST({ request }) {
	const { query } = (await request.json()) as { query?: string };
	const normalizedQuery = query?.trim() ?? '';

	if (!normalizedQuery) {
		return json([] satisfies FoodLookupResult[]);
	}

	return json(
		await withServerHealthDb(async (db) => {
			const catalogItems = await listFoodCatalogItems(db);
			const localMatches = searchPackagedFoodCatalog(normalizedQuery, catalogItems);
			const remoteProducts = await searchOpenFoodFactsProducts(normalizedQuery);
			const remoteMatches: FoodLookupResult[] = [];

			for (const product of remoteProducts) {
				const normalized = normalizeOpenFoodFactsProduct(product);
				if (!normalized) continue;
				const cached = await upsertFoodCatalogItem(db, normalized);
				remoteMatches.push({
					id: cached.id,
					name: cached.name,
					calories: cached.calories ?? 0,
					protein: cached.protein ?? 0,
					fiber: cached.fiber ?? 0,
					carbs: cached.carbs ?? 0,
					fat: cached.fat ?? 0,
					sourceName: cached.sourceName,
					sourceType: cached.sourceType,
					brandName: cached.brandName,
					barcode: cached.barcode
				});
			}

			const deduped = new Map<string, FoodLookupResult>();
			for (const match of [...localMatches, ...remoteMatches]) {
				deduped.set(match.id, match);
			}

			return [...deduped.values()];
		})
	);
}
