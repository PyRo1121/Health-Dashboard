import { describe, expect, it, vi } from 'vitest';
import { normalizeThemealdbMeal, searchThemealdbRecipes } from '$lib/server/nutrition/themealdb';

describe('themealdb adapter', () => {
	it('normalizes recipe payloads into cached recipe items', () => {
		const recipe = normalizeThemealdbMeal({
			idMeal: '52772',
			strMeal: 'Teriyaki Chicken Casserole',
			strCategory: 'Chicken',
			strArea: 'Japanese',
			strIngredient1: 'soy sauce',
			strMeasure1: '3/4 cup',
			strIngredient2: 'chicken breast',
			strMeasure2: '2'
		});

		expect(recipe).toMatchObject({
			id: 'themealdb:52772',
			title: 'Teriyaki Chicken Casserole',
			sourceType: 'themealdb',
			sourceName: 'TheMealDB',
			externalId: '52772',
			cuisine: 'Japanese'
		});
		expect(recipe.ingredients).toEqual(['3/4 cup soy sauce', '2 chicken breast']);
	});

	it('searches recipes by name', async () => {
		const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					meals: [
						{
							idMeal: '52772',
							strMeal: 'Teriyaki Chicken Casserole',
							strCategory: 'Chicken',
							strArea: 'Japanese',
							strIngredient1: 'soy sauce',
							strMeasure1: '3/4 cup'
						}
					]
				})
			)
		);

		const recipes = await searchThemealdbRecipes('teriyaki', fetchImpl);

		expect(recipes).toHaveLength(1);
		expect(recipes[0]?.title).toBe('Teriyaki Chicken Casserole');
		expect(fetchImpl.mock.calls[0]?.[0]).toContain('/search.php?s=teriyaki');
	});
});
