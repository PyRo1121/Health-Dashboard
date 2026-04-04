import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import { type FoodLookupResult, upsertFoodCatalogItem } from '$lib/features/nutrition/service';
import { fetchUsdaFoodDetail, normalizeUsdaFoodDetail } from '$lib/server/nutrition/usda';

function toLookupResult(item: Awaited<ReturnType<typeof upsertFoodCatalogItem>>): FoodLookupResult {
	return {
		id: item.id,
		name: item.name,
		calories: item.calories ?? 0,
		protein: item.protein ?? 0,
		fiber: item.fiber ?? 0,
		carbs: item.carbs ?? 0,
		fat: item.fat ?? 0,
		sourceName: item.sourceName,
		sourceType: item.sourceType,
		brandName: item.brandName,
		barcode: item.barcode,
		externalId: item.externalId,
		imageUrl: item.imageUrl,
		isEnriched: true
	};
}

export async function POST({ params }) {
	const apiKey = process.env.USDA_FDC_API_KEY ?? process.env.FDC_API_KEY;
	if (!apiKey) {
		return new Response('USDA API key is not configured.', { status: 503 });
	}

	return json(
		await withServerHealthDb(async (db) => {
			const detail = await fetchUsdaFoodDetail(params.fdcId, apiKey);
			const existing = await db.foodCatalogItems.get(`usda:${params.fdcId}`);
			const normalized = normalizeUsdaFoodDetail(detail, existing);
			return toLookupResult(await upsertFoodCatalogItem(db, normalized));
		})
	);
}
