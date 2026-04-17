import { describe, expect, it } from 'vitest';
import { buildNutritionRecommendations } from '$lib/features/nutrition/recommend';

describe('nutrition recommendations', () => {
  it('scores foods and recipes against meal context', () => {
    const recommendations = buildNutritionRecommendations({
      context: {
        mealType: 'breakfast',
        sleepHours: 6,
        sleepQuality: 3,
        anxietyCount: 1,
        symptomCount: 0,
      },
      foods: [
        {
          id: 'food-1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          name: 'Greek yogurt bowl',
          sourceType: 'custom',
          sourceName: 'Local catalog',
          calories: 320,
          protein: 24,
          fiber: 7,
        },
      ],
      recipes: [
        {
          id: 'themealdb:1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          title: 'Breakfast bean scramble',
          sourceType: 'themealdb',
          sourceName: 'TheMealDB',
          externalId: '1',
          mealType: 'breakfast',
          cuisine: 'American',
          ingredients: ['black beans', 'eggs', 'spinach'],
        },
      ],
    });

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0]?.reasons.length).toBeGreaterThan(0);
    expect(recommendations.map((item) => item.kind).sort()).toEqual(['food', 'recipe']);
  });

  it('keeps unknown-macro saved foods truthful instead of treating them as zero-macro wins', () => {
    const [recommendation] = buildNutritionRecommendations({
      context: {
        mealType: 'breakfast',
        sleepHours: 6,
        sleepQuality: 3,
        anxietyCount: 1,
        symptomCount: 0,
      },
      foods: [
        {
          id: 'food-1',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
          name: 'Teriyaki Chicken Casserole',
          sourceType: 'custom',
          sourceName: 'Local catalog',
        },
      ],
      recipes: [],
    });

    expect(recommendation).toMatchObject({
      kind: 'food',
      title: 'Teriyaki Chicken Casserole',
      subtitle: 'Nutrition totals unknown.',
    });
    expect(recommendation?.reasons).toEqual([
      'nutrition totals are still unknown, so treat this as a saved rotation idea.',
    ]);
    expect(recommendation?.score).toBeLessThan(35);
  });
});
