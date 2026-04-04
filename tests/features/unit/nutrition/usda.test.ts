import { describe, expect, it, vi } from 'vitest';
import {
	fetchUsdaFoodDetail,
	normalizeUsdaFoodDetail,
	normalizeUsdaSearchResult,
	searchUsdaFoods
} from '$lib/server/nutrition/usda';

describe('usda adapter', () => {
	it('normalizes search results and detail records', () => {
		const searchResult = normalizeUsdaSearchResult({
			fdcId: 12345,
			description: 'Chicken breast, roasted',
			brandOwner: 'USDA'
		});

		const detail = normalizeUsdaFoodDetail({
			fdcId: 12345,
			description: 'Chicken breast, roasted',
			brandOwner: 'USDA',
			foodNutrients: [
				{ nutrient: { number: '1008', name: 'Energy' }, amount: 165 },
				{ nutrient: { number: '1003', name: 'Protein' }, amount: 31 },
				{ nutrient: { number: '1079', name: 'Fiber, total dietary' }, amount: 0 }
			]
		});

		expect(searchResult).toMatchObject({
			id: 'usda-search:12345',
			externalId: '12345',
			isEnriched: false
		});
		expect(detail).toMatchObject({
			id: 'usda:12345',
			externalId: '12345',
			name: 'Chicken breast, roasted',
			calories: 165,
			protein: 31,
			fiber: 0
		});
	});

	it('searches foods and fetches detail from USDA', async () => {
		const fetchImpl = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						foods: [{ fdcId: 12345, description: 'Chicken breast, roasted' }]
					})
				)
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						fdcId: 12345,
						description: 'Chicken breast, roasted',
						foodNutrients: [{ nutrient: { number: '1003' }, amount: 31 }]
					})
				)
			);

		const results = await searchUsdaFoods('chicken', 'demo-key', fetchImpl);
		const detail = await fetchUsdaFoodDetail('12345', 'demo-key', fetchImpl);

		expect(results).toHaveLength(1);
		expect(results[0]?.externalId).toBe('12345');
		expect(detail.fdcId).toBe(12345);
		expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('POST');
	});
});
