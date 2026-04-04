import { describe, expect, it } from 'vitest';
import type { DailyRecord, FoodEntry, WeeklyPlan, PlanSlot, GroceryItem } from '$lib/core/domain/types';
import {
	buildPlanningHighlights,
	buildNutritionStrategy,
	computeCorrelations,
	computeTrendComparisonsFromData,
	weekRangeFromAnchorDay
} from '$lib/features/review/analytics';

describe('review analytics', () => {
	it('derives week range from an anchor day', () => {
		expect(weekRangeFromAnchorDay('2026-04-02')).toEqual({
			weekStart: '2026-03-30',
			days: [
				'2026-03-30',
				'2026-03-31',
				'2026-04-01',
				'2026-04-02',
				'2026-04-03',
				'2026-04-04',
				'2026-04-05'
			]
		});
	});

	it('computes trend comparisons and correlations from week data without DB access', () => {
		const records: DailyRecord[] = [
			{
				id: 'daily-1',
				createdAt: '2026-03-30T08:00:00.000Z',
				updatedAt: '2026-03-30T08:00:00.000Z',
				date: '2026-03-30',
				mood: 3,
				energy: 2,
				sleepHours: 6
			},
			{
				id: 'daily-2',
				createdAt: '2026-04-01T08:00:00.000Z',
				updatedAt: '2026-04-01T08:00:00.000Z',
				date: '2026-04-01',
				mood: 5,
				energy: 4,
				sleepHours: 8
			}
		];
		const foods: FoodEntry[] = [
			{
				id: 'food-1',
				createdAt: '2026-03-30T09:00:00.000Z',
				updatedAt: '2026-03-30T09:00:00.000Z',
				localDay: '2026-03-30',
				name: 'Low protein breakfast',
				protein: 25
			},
			{
				id: 'food-2',
				createdAt: '2026-04-01T09:00:00.000Z',
				updatedAt: '2026-04-01T09:00:00.000Z',
				localDay: '2026-04-01',
				name: 'Higher protein breakfast',
				protein: 95
			}
		];

		expect(computeTrendComparisonsFromData('2026-03-30', records, foods)).toEqual({
			weekStart: '2026-03-30',
			daysTracked: 2,
			averageMood: 4,
			averageSleep: 7,
			averageProtein: 60
		});
		expect(computeCorrelations(records, foods).map((item) => item.label)).toEqual([
			'Higher sleep tracked with better mood',
			'Higher protein tracked with steadier energy'
		]);
	});

	it('builds structured nutrition strategy items for review actions', () => {
		const records: DailyRecord[] = [
			{
				id: 'daily-1',
				createdAt: '2026-03-30T08:00:00.000Z',
				updatedAt: '2026-03-30T08:00:00.000Z',
				date: '2026-03-30',
				sleepHours: 6,
				sleepQuality: 3
			}
		];
		const foods: FoodEntry[] = [
			{
				id: 'food-1',
				createdAt: '2026-03-30T09:00:00.000Z',
				updatedAt: '2026-03-30T09:00:00.000Z',
				localDay: '2026-03-30',
				name: 'Greek yogurt bowl',
				protein: 24,
				fiber: 6
			}
		];

		expect(
			buildNutritionStrategy(
				records,
				foods,
				[],
				[
					{
						id: 'food-catalog-1',
						createdAt: '2026-03-30T08:00:00.000Z',
						updatedAt: '2026-03-30T08:00:00.000Z',
						name: 'Greek yogurt bowl',
						sourceType: 'custom',
						sourceName: 'Local catalog',
						calories: 310,
						protein: 24,
						fiber: 6,
						carbs: 34,
						fat: 8
					}
				],
				[
					{
						id: 'themealdb:52772',
						createdAt: '2026-03-30T08:00:00.000Z',
						updatedAt: '2026-03-30T08:00:00.000Z',
						title: 'Teriyaki Chicken Casserole',
						sourceType: 'themealdb',
						sourceName: 'TheMealDB',
						externalId: '52772',
						mealType: 'dinner',
						ingredients: ['soy sauce', 'chicken breast']
					}
				]
			)
		).toEqual([
			{
				kind: 'repeat',
				recommendationKind: 'food',
				recommendationId: 'food-catalog-1',
				title: 'Greek yogurt bowl',
				detail: 'protein target looks strong'
			},
			{
				kind: 'rotate',
				recommendationKind: 'recipe',
				recommendationId: 'themealdb:52772',
				title: 'Teriyaki Chicken Casserole',
				detail: 'protein-forward ingredients'
			}
		]);
	});

	it('builds planning highlights from weekly slots and groceries', () => {
		const weeklyPlan: WeeklyPlan = {
			id: 'weekly-plan-1',
			createdAt: '2026-03-30T08:00:00.000Z',
			updatedAt: '2026-03-30T08:00:00.000Z',
			weekStart: '2026-03-30',
			title: 'This Week'
		};
		const planSlots: PlanSlot[] = [
			{
				id: 'slot-1',
				createdAt: '2026-03-30T08:00:00.000Z',
				updatedAt: '2026-03-30T08:00:00.000Z',
				weeklyPlanId: weeklyPlan.id,
				localDay: '2026-04-02',
				slotType: 'meal',
				itemType: 'recipe',
				itemId: 'themealdb:52772',
				title: 'Teriyaki Chicken Casserole',
				status: 'done',
				order: 0
			},
			{
				id: 'slot-2',
				createdAt: '2026-03-30T08:00:00.000Z',
				updatedAt: '2026-03-30T08:00:00.000Z',
				weeklyPlanId: weeklyPlan.id,
				localDay: '2026-04-03',
				slotType: 'workout',
				itemType: 'freeform',
				title: 'Recovery walk',
				status: 'planned',
				order: 1
			}
		];
		const groceryItems: GroceryItem[] = [
			{
				id: 'grocery-1',
				createdAt: '2026-03-30T08:00:00.000Z',
				updatedAt: '2026-03-30T08:00:00.000Z',
				weeklyPlanId: weeklyPlan.id,
				ingredientKey: 'soy sauce',
				label: 'soy sauce',
				checked: true,
				excluded: false,
				onHand: true,
				sourceRecipeIds: ['themealdb:52772']
			}
		];

		expect(buildPlanningHighlights(weeklyPlan, planSlots, groceryItems)).toEqual([
			'This Week: 1/2 plan items completed.',
			'Meals planned: 1/1 completed.',
			'Workouts planned: 0/1 completed.',
			'Groceries: 1/1 checked, 1 on hand.'
		]);
	});
});
