import { json } from '@sveltejs/kit';
import { withServerHealthDb } from '$lib/server/db/client';
import { listFoodCatalogItems, type FoodLookupResult, upsertFoodCatalogItem } from '$lib/features/nutrition/service';
import {
	fetchOpenFoodFactsProductByBarcode,
	normalizeOpenFoodFactsBarcode,
	normalizeOpenFoodFactsProduct
} from '$lib/server/nutrition/open-food-facts';

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
		barcode: item.barcode
	};
}

export async function POST({ params }) {
	const barcode = normalizeOpenFoodFactsBarcode(params.code);
	if (!barcode) {
		return json(null satisfies FoodLookupResult | null);
	}

	return json(
		await withServerHealthDb(async (db) => {
			const catalogItems = await listFoodCatalogItems(db);
			const local = catalogItems.find((item) => item.barcode === barcode);
			if (local) {
				return toLookupResult(local);
			}

			const product = await fetchOpenFoodFactsProductByBarcode(barcode);
			if (!product) return null;

			const normalized = normalizeOpenFoodFactsProduct(product);
			if (!normalized) return null;

			return toLookupResult(await upsertFoodCatalogItem(db, normalized));
		})
	);
}
