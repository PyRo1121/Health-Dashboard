import { describe, expect, it, vi } from 'vitest';
import {
	fetchOpenFoodFactsProductByBarcode,
	normalizeOpenFoodFactsBarcode,
	normalizeOpenFoodFactsProduct,
	searchOpenFoodFactsProducts
} from '$lib/server/nutrition/open-food-facts';

describe('open food facts adapter', () => {
	it('normalizes barcodes and packaged products', () => {
		expect(normalizeOpenFoodFactsBarcode('  049000028911 ')).toBe('049000028911');

		const normalized = normalizeOpenFoodFactsProduct({
			code: '049000028911',
			product_name: 'Diet Cola',
			brands: 'Acme Drinks',
			nutriments: {
				'energy-kcal_100g': 1,
				carbohydrates_100g: 0,
				fat_100g: 0,
				proteins_100g: 0,
				fiber_100g: 0
			}
		});

		expect(normalized).toMatchObject({
			id: 'off:049000028911',
			name: 'Diet Cola',
			sourceType: 'open-food-facts',
			sourceName: 'Open Food Facts',
			brandName: 'Acme Drinks',
			barcode: '049000028911',
			calories: 1,
			carbs: 0,
			fat: 0
		});
	});

	it('fetches barcode results and handles misses', async () => {
		const fetchImpl = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						status: 1,
						product: {
							code: '049000028911',
							product_name: 'Diet Cola'
						}
					})
				)
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ status: 0 })));

		const hit = await fetchOpenFoodFactsProductByBarcode('049000028911', fetchImpl);
		const miss = await fetchOpenFoodFactsProductByBarcode('0000', fetchImpl);

		expect(hit?.product_name).toBe('Diet Cola');
		expect(miss).toBeNull();
	});

	it('searches packaged products with the v1 search endpoint', async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					products: [
						{ code: '049000028911', product_name: 'Diet Cola' },
						{ code: '0123456789012', product_name: 'Diet Lemonade' }
					]
				})
			)
		);

		const results = await searchOpenFoodFactsProducts('diet', fetchImpl);

		expect(results).toHaveLength(2);
		expect(fetchImpl.mock.calls[0]?.[0]).toContain('/cgi/search.pl?');
	});
});
