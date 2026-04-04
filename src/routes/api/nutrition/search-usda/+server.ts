import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import {
	listFoodCatalogItems,
	searchFoodData,
	searchLocalFoodCatalog,
	type FoodLookupResult
} from '$lib/features/nutrition/service';
import { searchUsdaFoods } from '$lib/server/nutrition/usda';

type SearchUsdaResponse = {
	matches: FoodLookupResult[];
	notice?: string;
};

export async function POST({ request }) {
	const { query } = (await request.json()) as { query?: string };
	const normalizedQuery = query?.trim() ?? '';

	if (!normalizedQuery) {
		return json({ matches: [] } satisfies SearchUsdaResponse);
	}

	return json(
		await withServerHealthDb(async (db) => {
			const catalogItems = await listFoodCatalogItems(db);
			const localMatches = searchLocalFoodCatalog(normalizedQuery, catalogItems);
			const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;

			if (!apiKey) {
				return {
					matches: searchFoodData(normalizedQuery, catalogItems),
					notice: 'USDA live search unavailable, using local fallback foods.'
				} satisfies SearchUsdaResponse;
			}

			const remoteMatches = await searchUsdaFoods(normalizedQuery, apiKey);
			const deduped = new Map<string, FoodLookupResult>();

			for (const match of [...localMatches, ...remoteMatches]) {
				deduped.set(match.id, match);
			}

			return {
				matches: [...deduped.values()],
				notice: remoteMatches.length ? '' : 'No USDA matches found, showing local results only.'
			} satisfies SearchUsdaResponse;
		})
	);
}
