import { describe, expect, it } from 'vitest';
import type { TodaySnapshot } from '$lib/features/today/snapshot';
import {
  createDailyCheckinPayload,
  createTodayEventRows,
  createTodayNutritionGuidance,
  createTodayNutritionPulseMetrics,
  createPlannedMealProjectionRows,
  createPlannedWorkoutRows,
  createTodayConfidenceLabel,
  createTodayRecommendationRows,
  createTodayForm,
  createTodayFormFromSnapshot,
  createTodayNutritionRows,
  createTodayRecordRows,
  createTodayRecommendationSupportRows,
} from '$lib/features/today/model';

describe('today model', () => {
  it('hydrates the form, rows, and payload from a snapshot', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
      dailyRecord: {
        id: 'daily:2026-04-02',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        date: '2026-04-02',
        mood: 4,
        energy: 3,
        stress: 2,
        focus: 5,
        sleepHours: 7.5,
        sleepQuality: 4,
        freeformNote: 'Steady start.',
      },
      foodEntries: [],
      nutritionSummary: {
        calories: 320,
        protein: 24,
        fiber: 6,
        carbs: 34,
        fat: 8,
      },
      plannedMeal: null,
      plannedMealIssue: null,
      plannedWorkout: {
        id: 'slot-1',
        title: 'Full body reset',
        subtitle: 'Recovery · 1 exercise · Quadriceps · Dumbbell',
        status: 'planned',
      },
      plannedWorkoutIssue: null,
      recoveryAdaptation: null,
      intelligence: {
        primaryRecommendation: null,
        fallbackState: {
          title: 'No strong recommendation yet.',
          message: 'Stay with the planned day and keep logging signals.',
          action: { kind: 'href', label: 'Open Plan', href: '/plan' },
        },
      },
      planItems: [],
      events: [],
      latestJournalEntry: null,
    };

    expect(createTodayForm()).toMatchObject({ mood: '3', freeformNote: '' });
    expect(createTodayFormFromSnapshot(snapshot)).toMatchObject({
      mood: '4',
      freeformNote: 'Steady start.',
    });
    expect(createTodayRecordRows(snapshot)).toContain('Steady start.');
    expect(createTodayNutritionRows(snapshot)).toContain('Calories: 320');
    expect(createTodayNutritionPulseMetrics(snapshot)).toEqual([
      { label: 'Protein pace', current: 24, target: 80, projected: null, tone: 'steady' },
      { label: 'Fiber pace', current: 6, target: 25, projected: null, tone: 'steady' },
    ]);
    expect(createTodayNutritionGuidance(snapshot)[0]).toMatch(/Protein is still low so far/i);
    expect(createPlannedMealProjectionRows(snapshot)).toEqual([]);
    expect(createPlannedWorkoutRows(snapshot.plannedWorkout)).toEqual([
      'Recovery · 1 exercise · Quadriceps · Dumbbell',
      'Status: planned',
    ]);
    expect(createTodayConfidenceLabel('low')).toBe('Low confidence');
    expect(createTodayRecommendationRows(snapshot)).toEqual([]);
    expect(createTodayRecommendationSupportRows(snapshot)).toEqual([]);
    expect(
      createDailyCheckinPayload(snapshot.date, createTodayFormFromSnapshot(snapshot))
    ).toMatchObject({
      date: '2026-04-02',
      mood: 4,
      focus: 5,
    });
  });

  it('carries reference links into today event rows for same-day health events', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
      dailyRecord: null,
      foodEntries: [],
      nutritionSummary: {
        calories: 0,
        protein: 0,
        fiber: 0,
        carbs: 0,
        fat: 0,
      },
      plannedMeal: null,
      plannedMealIssue: null,
      plannedWorkout: null,
      plannedWorkoutIssue: null,
      recoveryAdaptation: null,
      intelligence: {
        primaryRecommendation: null,
        fallbackState: null,
      },
      planItems: [],
      events: [
        {
          id: 'symptom-headache',
          createdAt: '2026-04-02T12:00:00Z',
          updatedAt: '2026-04-02T12:00:00Z',
          sourceType: 'manual',
          sourceApp: 'personal-health-cockpit',
          sourceTimestamp: '2026-04-02T12:00:00Z',
          localDay: '2026-04-02',
          confidence: 1,
          eventType: 'symptom',
          value: 4,
          payload: {
            kind: 'symptom',
            symptom: 'Headache',
            severity: 4,
            referenceUrl:
              'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
          },
        },
      ],
      latestJournalEntry: null,
    };

    expect(createTodayEventRows(snapshot)).toEqual([
      expect.objectContaining({
        label: 'Symptom',
        referenceUrl:
          'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
      }),
    ]);
  });

  it('builds recommendation support rows from plan, nutrition, and recovery context', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
      dailyRecord: null,
      foodEntries: [],
      nutritionSummary: {
        calories: 320,
        protein: 24,
        fiber: 6,
        carbs: 34,
        fat: 8,
      },
      plannedMeal: null,
      plannedMealIssue: null,
      plannedWorkout: {
        id: 'slot-1',
        title: 'Full body reset',
        subtitle: 'Recovery · 1 exercise · Quadriceps · Dumbbell',
        status: 'planned',
      },
      plannedWorkoutIssue: null,
      recoveryAdaptation: {
        level: 'recovery',
        headline: 'Keep today lighter',
        reasons: ['Sleep landed under 6 hours.'],
        mealFallback: ['Meal fallback: keep the next meal familiar, easy, and protein-forward.'],
        workoutFallback: [
          'Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.',
        ],
        mealRecommendation: {
          title: 'Greek yogurt bowl',
          subtitle: 'Saved food · Local catalog · 24g protein',
          reasons: ['Protein-forward and easy to repeat.'],
          actionId: 'apply-recovery-meal',
          actionLabel: 'Swap to recovery meal',
        },
        workoutRecommendation: {
          title: 'Recovery walk',
          subtitle: '10-20 minutes easy walk or mobility reset',
          reasons: ['Lower friction movement fits recovery better.'],
          actionId: 'apply-recovery-workout',
          actionLabel: 'Swap to recovery walk',
        },
        actions: [],
      },
      intelligence: {
        primaryRecommendation: {
          id: 'recommendation-1',
          kind: 'recovery',
          title: 'Keep today lighter',
          summary: 'Recovery signals are elevated.',
          confidence: 'high',
          score: 0.92,
          reasons: ['Sleep and symptoms point toward a lighter day.'],
          provenance: [
            {
              label: 'Sleep landed under 6 hours.',
              sourceKind: 'daily_record',
            },
          ],
          primaryAction: { kind: 'href', label: 'Open Plan', href: '/plan' },
          secondaryAction: null,
          supportingAction: null,
        },
        fallbackState: {
          title: 'No strong recommendation yet.',
          message: 'Stay with the planned day and keep logging signals.',
          action: { kind: 'href', label: 'Open Plan', href: '/plan' },
        },
      },
      planItems: [],
      events: [],
      latestJournalEntry: null,
    };

    expect(createTodayRecommendationSupportRows(snapshot)).toEqual([
      'Plan: Full body reset is still queued.',
      'Nutrition: protein 24g, fiber 6g so far.',
      'Meal fallback: keep the next meal familiar, easy, and protein-forward.',
      'Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.',
      'Recovery meal: Greek yogurt bowl.',
      'Recovery workout: Recovery walk.',
    ]);
  });

  it('does not fabricate planned-meal projections or fallback meal advice when a recipe handoff has no nutrition totals', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
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
        id: 'planned-slot:recipe-1',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        name: 'Teriyaki Chicken Casserole',
        mealType: 'dinner',
        sourceName: 'TheMealDB',
        notes: '3/4 cup soy sauce, 2 chicken breast',
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
    };

    expect(createTodayNutritionPulseMetrics(snapshot)).toEqual([
      { label: 'Protein pace', current: 24, target: 80, projected: null, tone: 'steady' },
      { label: 'Fiber pace', current: 6, target: 25, projected: null, tone: 'steady' },
    ]);
    expect(createTodayNutritionGuidance(snapshot)).toEqual([
      'The queued meal keeps plan and Today aligned, but its nutrition totals are still unknown.',
    ]);
    expect(createPlannedMealProjectionRows(snapshot)).toEqual([]);
  });

  it('keeps today nutrition pulse and guidance truthful when a logged meal has unknown nutrition totals', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
      dailyRecord: null,
      foodEntries: [
        {
          id: 'food-entry-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          localDay: '2026-04-02',
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
    };

    expect(createTodayNutritionRows(snapshot)).toEqual([
      'Calories: unknown',
      'Protein: unknown',
      'Fiber: unknown',
      'Carbs: unknown',
      'Fat: unknown',
    ]);
    expect(createTodayNutritionPulseMetrics(snapshot)).toEqual([
      { label: 'Protein pace', current: null, target: 80, projected: null, tone: 'steady' },
      { label: 'Fiber pace', current: null, target: 25, projected: null, tone: 'steady' },
    ]);
    expect(createTodayNutritionGuidance(snapshot)).toEqual([
      "Today's logged meals are missing nutrition totals, so protein and fiber pace are still unknown.",
    ]);
    expect(
      createTodayRecommendationSupportRows({
        ...snapshot,
        intelligence: {
          primaryRecommendation: {
            id: 'recommendation-1',
            kind: 'recovery',
            title: 'Keep today lighter',
            summary: 'Recovery signals are elevated.',
            confidence: 'high',
            score: 92,
            reasons: ['Sleep and symptoms point toward a lighter day.'],
            provenance: [],
            primaryAction: { kind: 'href', label: 'Open Plan', href: '/plan' },
            secondaryAction: null,
            supportingAction: null,
          },
          fallbackState: null,
        },
      })
    ).toContain("Nutrition: today's logged meal totals are still unknown.");
    expect(createPlannedMealProjectionRows(snapshot)).toEqual([]);
  });

  it('keeps partial unknown nutrition guidance truthful metric by metric', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
      dailyRecord: null,
      foodEntries: [
        {
          id: 'food-entry-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          localDay: '2026-04-02',
          mealType: 'breakfast',
          name: 'Protein-only meal',
          protein: 24,
        },
      ],
      nutritionSummary: {
        calories: 0,
        protein: 24,
        fiber: 0,
        carbs: 0,
        fat: 0,
      },
      plannedMeal: null,
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
    };

    expect(createTodayNutritionRows(snapshot)).toEqual([
      'Calories: unknown',
      'Protein: 24',
      'Fiber: unknown',
      'Carbs: unknown',
      'Fat: unknown',
    ]);
    expect(createTodayNutritionPulseMetrics(snapshot)).toEqual([
      { label: 'Protein pace', current: 24, target: 80, projected: null, tone: 'steady' },
      { label: 'Fiber pace', current: null, target: 25, projected: null, tone: 'steady' },
    ]);
    expect(createTodayNutritionGuidance(snapshot)).toEqual([
      'Protein is still low so far. A 20g+ meal would change the day more than another snack.',
      'Fiber pace is still unknown because one logged meal is missing nutrition totals.',
    ]);
    expect(
      createTodayRecommendationSupportRows({
        ...snapshot,
        intelligence: {
          primaryRecommendation: {
            id: 'recommendation-1',
            kind: 'recovery',
            title: 'Keep today lighter',
            summary: 'Recovery signals are elevated.',
            confidence: 'high',
            score: 92,
            reasons: ['Sleep and symptoms point toward a lighter day.'],
            provenance: [],
            primaryAction: { kind: 'href', label: 'Open Plan', href: '/plan' },
            secondaryAction: null,
            supportingAction: null,
          },
          fallbackState: null,
        },
      })
    ).toContain('Nutrition: protein 24g so far; fiber pace is unknown.');
  });

  it('keeps mixed known and unknown planned-meal projections truthful when a planned meal exists', () => {
    const snapshot: TodaySnapshot = {
      date: '2026-04-02',
      dailyRecord: null,
      foodEntries: [
        {
          id: 'food-entry-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          localDay: '2026-04-02',
          mealType: 'breakfast',
          name: 'Mostly-known meal',
          calories: 320,
          protein: 24,
          carbs: 34,
          fat: 8,
        },
      ],
      nutritionSummary: {
        calories: 320,
        protein: 24,
        fiber: 0,
        carbs: 34,
        fat: 8,
      },
      plannedMeal: {
        id: 'planned-meal-1',
        createdAt: '2026-04-02T08:30:00.000Z',
        updatedAt: '2026-04-02T08:30:00.000Z',
        name: 'Greek yogurt bowl',
        mealType: 'lunch',
        calories: 310,
        protein: 20,
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
    };

    expect(createTodayNutritionPulseMetrics(snapshot)).toEqual([
      { label: 'Protein pace', current: 24, target: 80, projected: 44, tone: 'steady' },
      { label: 'Fiber pace', current: null, target: 25, projected: null, tone: 'steady' },
    ]);
    expect(createPlannedMealProjectionRows(snapshot)).toEqual([
      'Projected calories: 630',
      'Projected protein: 44',
      'Projected carbs: 68',
      'Projected fat: 16',
    ]);
    expect(createTodayNutritionGuidance(snapshot)).toEqual([
      'The planned meal helps, but protein still looks light for the day.',
    ]);
  });
});
