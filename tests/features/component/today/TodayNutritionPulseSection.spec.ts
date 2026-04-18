import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { TodaySnapshot } from '$lib/features/today/snapshot';
import TodayNutritionPulseSection from '../../../../src/lib/features/today/components/TodayNutritionPulseSection.svelte';

function createSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    date: '2026-04-14',
    dailyRecord: null,
    foodEntries: [],
    nutritionSummary: {
      calories: 320,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
    },
    plannedMeal: {
      id: 'planned-slot:slot-1',
      createdAt: '2026-04-14T08:00:00.000Z',
      updatedAt: '2026-04-14T08:00:00.000Z',
      name: 'Greek yogurt bowl',
      mealType: 'breakfast',
      calories: 310,
      protein: 24,
      fiber: 6,
      carbs: 34,
      fat: 8,
      sourceName: 'Local catalog',
    },
    plannedMealIssue: null,
    plannedWorkout: null,
    plannedWorkoutIssue: null,
    recoveryAdaptation: null,
    intelligence: {
      primaryRecommendation: null,
      fallbackState: null,
    },
    planItems: [],
    events: [],
    latestJournalEntry: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('TodayNutritionPulseSection', () => {
  it('renders pulse cards, guidance, summary rows, and planned-meal projections', () => {
    render(TodayNutritionPulseSection, {
      snapshot: createSnapshot(),
      todayNutritionPulseMetrics: [
        { label: 'Protein pace', current: 24, target: 80, projected: 48, tone: 'steady' },
        { label: 'Fiber pace', current: 6, target: 25, projected: 12, tone: 'boost' },
      ],
      todayNutritionGuidance: [
        'The planned meal meaningfully lifts your protein pace.',
        'The planned meal keeps fiber moving in the right direction.',
      ],
      todayNutritionRows: ['Calories: 320', 'Protein: 24', 'Fiber: 6'],
      plannedMealProjectionRows: [
        'Projected calories: 630',
        'Projected protein: 48',
        'Projected fiber: 12',
      ],
    });

    expect(screen.getByText('Nutrition pulse')).toBeTruthy();
    expect(screen.getByText('Protein pace')).toBeTruthy();
    expect(screen.getByText('24 / 80g')).toBeTruthy();
    expect(screen.getByText('Planned next: 48 / 80g')).toBeTruthy();
    expect(screen.getByText('Fiber pace')).toBeTruthy();
    expect(screen.getByText('The planned meal meaningfully lifts your protein pace.')).toBeTruthy();
    expect(screen.getByText('Calories: 320')).toBeTruthy();
    expect(screen.getByText('If you log the planned meal next:')).toBeTruthy();
    expect(screen.getByText('Projected protein: 48')).toBeTruthy();
  });

  it('renders the explicit empty state when no today snapshot exists', () => {
    render(TodayNutritionPulseSection, {
      snapshot: null,
      todayNutritionPulseMetrics: [],
      todayNutritionGuidance: [],
      todayNutritionRows: [],
      plannedMealProjectionRows: [],
    });

    expect(screen.getByText('No nutrition signal yet.')).toBeTruthy();
    expect(screen.getByText('Meals and plans will show their intake impact here.')).toBeTruthy();
  });

  it('renders unknown pace truthfully when logged meals are missing nutrition totals', () => {
    render(TodayNutritionPulseSection, {
      snapshot: createSnapshot({
        foodEntries: [
          {
            id: 'food-entry-1',
            createdAt: '2026-04-14T08:00:00.000Z',
            updatedAt: '2026-04-14T08:00:00.000Z',
            localDay: '2026-04-14',
            mealType: 'breakfast',
            name: 'Name-only meal',
          },
        ],
        nutritionSummary: {
          calories: 0,
          protein: 0,
          fiber: 0,
          carbs: 0,
          fat: 0,
        },
        plannedMeal: null,
      }),
      todayNutritionPulseMetrics: [
        { label: 'Protein pace', current: null, target: 80, projected: null, tone: 'steady' },
        { label: 'Fiber pace', current: null, target: 25, projected: null, tone: 'steady' },
      ],
      todayNutritionGuidance: [
        "Today's logged meals are missing nutrition totals, so protein and fiber pace are still unknown.",
      ],
      todayNutritionRows: [
        'Calories: unknown',
        'Protein: unknown',
        'Fiber: unknown',
        'Carbs: unknown',
        'Fat: unknown',
      ],
      plannedMealProjectionRows: [],
    });

    expect(screen.getByText('unknown / 80g')).toBeTruthy();
    expect(screen.getByText('unknown / 25g')).toBeTruthy();
    expect(
      screen.getByText(
        "Today's logged meals are missing nutrition totals, so protein and fiber pace are still unknown."
      )
    ).toBeTruthy();
    expect(screen.getByText('Calories: unknown')).toBeTruthy();
    expect(screen.queryByText(/Protein is still low so far\./i)).toBeNull();
  });
});
