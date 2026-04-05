import { describe, expect, it } from 'vitest';
import type { WeeklyReviewData } from '$lib/features/review/service';
import {
  createReviewAdherenceCards,
  createNutritionStrategyCards,
  createReviewSections,
  createReviewTrendRows,
} from '$lib/features/review/model';

describe('review model', () => {
  it('builds trend rows and review sections', () => {
    const weekly: WeeklyReviewData = {
      snapshot: {
        id: 'review:2026-03-31',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weekStart: '2026-03-31',
        headline: 'Mindful reset',
        daysTracked: 3,
        flags: ['Sleep dipped below 7 hours on multiple tracked days.'],
        correlations: [],
        experiment: 'Increase hydration tracking',
      },
      averageMood: 4.2,
      averageSleep: 7.1,
      averageProtein: 83,
      sobrietyStreak: 2,
      nutritionHighlights: ['2026-04-02: 88g protein logged'],
      nutritionStrategy: [
        {
          kind: 'repeat',
          recommendationKind: 'food',
          recommendationId: 'food-catalog-1',
          title: 'Greek yogurt bowl',
          detail: 'protein target looks strong',
        },
        {
          kind: 'skip',
          recommendationKind: 'recipe',
          recommendationId: 'themealdb:52772',
          title: 'Teriyaki Chicken Casserole',
          detail: 'skipped in the weekly plan',
        },
      ],
      planningHighlights: ['This Week: 1/2 plan items completed.'],
      adherenceScores: [
        {
          label: 'Overall',
          score: 67,
          completed: 2,
          missed: 1,
          pending: 0,
          tone: 'mixed',
          detail: '2 hits, 1 miss',
        },
        {
          label: 'Workouts',
          score: 100,
          completed: 1,
          missed: 0,
          pending: 0,
          tone: 'steady',
          detail: '1 hit, 0 misses',
        },
      ],
      adherenceSignals: [
        'Meal miss: Teriyaki Chicken Casserole was skipped.',
        'Workout hit: Full body reset was completed as planned.',
      ],
      grocerySignals: [
        'Potential waste: Teriyaki Chicken Casserole was missed after 1 grocery item had already been sourced.',
      ],
      deviceHighlights: ['Sleep duration: 8 hours on 2026-04-02'],
      assessmentSummary: ['WHO-5: Strong wellbeing (17)'],
      healthHighlights: [],
      experimentOptions: ['Increase hydration tracking'],
    };

    expect(createReviewTrendRows(weekly)).toContain('Average mood: 4.2');
    expect(createReviewSections(weekly).map((section) => section.title)).toEqual([
      'Drift flags',
      'Assessment changes',
      'Health highlights',
      'Food adherence highlights',
      'Plan follow-through',
      'Actual vs plan',
      'Grocery misses / waste',
      'Repeat / rotate / skip next week',
      'Device highlights',
    ]);
    expect(createReviewAdherenceCards(weekly)).toEqual([
      {
        label: 'Overall',
        value: '67%',
        detail: '2 hits, 1 miss.',
        tone: 'mixed',
      },
      {
        label: 'Workouts',
        value: '100%',
        detail: '1 hit, 0 misses.',
        tone: 'steady',
      },
    ]);
    expect(createNutritionStrategyCards(weekly)).toEqual([
      {
        badge: 'Repeat',
        title: 'Greek yogurt bowl',
        detail: 'protein target looks strong.',
        href: '/nutrition?loadKind=food&loadId=food-catalog-1',
        actionLabel: 'Load food',
      },
      {
        badge: 'Skip',
        title: 'Teriyaki Chicken Casserole',
        detail: 'skipped in the weekly plan.',
        href: '/nutrition?loadKind=recipe&loadId=themealdb%3A52772',
        actionLabel: 'Review recipe',
      },
    ]);
  });

  it('surfaces a dedicated health highlights section when weekly health signals are available', () => {
    const weekly: WeeklyReviewData = {
      snapshot: {
        id: 'review:2026-03-31',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weekStart: '2026-03-31',
        headline: 'Mindful reset',
        daysTracked: 3,
        flags: [],
        correlations: [],
        experiment: undefined,
      },
      averageMood: 4.2,
      averageSleep: 6.2,
      averageProtein: 71,
      sobrietyStreak: 2,
      nutritionHighlights: [],
      nutritionStrategy: [],
      planningHighlights: [],
      adherenceScores: [],
      adherenceSignals: [],
      grocerySignals: [],
      deviceHighlights: [],
      assessmentSummary: [],
      healthHighlights: ['Low sleep lined up with higher anxiety on 2026-04-02.'],
      experimentOptions: ['Increase hydration tracking'],
    };

    expect(createReviewSections(weekly).map((section) => section.title)).toContain(
      'Health highlights'
    );
  });
});
