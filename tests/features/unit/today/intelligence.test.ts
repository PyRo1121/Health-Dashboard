import { describe, expect, it } from 'vitest';
import { buildTodayIntelligence, type TodayIntelligenceInput } from '$lib/features/today/intelligence';

function createBaseInput(overrides: Partial<TodayIntelligenceInput> = {}): TodayIntelligenceInput {
  return {
    date: '2026-04-02',
    dailyRecord: null,
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
    latestJournalEntry: null,
    events: [],
    planItemsCount: 0,
    ...overrides,
  };
}

describe('today intelligence', () => {
  it('prioritizes recovery when same-day strain is strong', () => {
    const result = buildTodayIntelligence(
      createBaseInput({
        dailyRecord: {
          id: 'daily:2026-04-02',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          date: '2026-04-02',
          mood: 3,
          energy: 2,
          stress: 4,
          focus: 3,
          sleepHours: 5.5,
          sleepQuality: 2,
          freeformNote: 'Dragging today.',
        },
        plannedMeal: {
          id: 'planned-meal-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          name: 'Toast and jam',
          mealType: 'breakfast',
          calories: 260,
          protein: 6,
          fiber: 2,
          carbs: 42,
          fat: 6,
          sourceName: 'Local catalog',
        },
        plannedWorkout: {
          id: 'slot-workout-1',
          title: 'Full body reset',
          subtitle: 'Recovery · 1 exercise · Quadriceps · Dumbbell',
          status: 'planned',
        },
        recoveryAdaptation: {
          level: 'recovery',
          headline: 'Recovery mode: simplify the day.',
          reasons: [
            'Sleep landed under 6 hours.',
            'Symptom load is elevated today.',
            'Anxiety intensity spiked today.',
          ],
          mealFallback: ['Meal fallback: keep the next meal familiar, easy, and protein-forward.'],
          workoutFallback: ['Workout fallback: downgrade Full body reset to a short walk, mobility reset, or full rest.'],
          mealRecommendation: {
            title: 'Greek yogurt bowl',
            subtitle: '310 kcal · 24g protein · easy to log',
            reasons: ['It lifts protein pace without adding friction.'],
            actionId: 'apply-recovery-meal',
            actionLabel: 'Swap to recovery meal',
          },
          workoutRecommendation: {
            title: 'Recovery walk',
            subtitle: '10-20 minutes · easy pace · optional mobility',
            reasons: ['Keeps movement without asking for intensity.'],
            actionId: 'apply-recovery-workout',
            actionLabel: 'Swap to recovery walk',
          },
          actions: [
            { id: 'apply-recovery-meal', label: 'Swap to recovery meal' },
            { id: 'apply-recovery-workout', label: 'Swap to recovery walk' },
          ],
        },
        events: [
          {
            id: 'symptom-1',
            createdAt: '2026-04-02T09:00:00.000Z',
            updatedAt: '2026-04-02T09:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            localDay: '2026-04-02',
            confidence: 1,
            eventType: 'symptom',
            value: 4,
            payload: { symptom: 'Headache', severity: 4 },
          },
          {
            id: 'anxiety-1',
            createdAt: '2026-04-02T10:00:00.000Z',
            updatedAt: '2026-04-02T10:00:00.000Z',
            sourceType: 'manual',
            sourceApp: 'personal-health-cockpit',
            localDay: '2026-04-02',
            confidence: 1,
            eventType: 'anxiety-episode',
            value: 7,
            payload: { intensity: 7, trigger: 'Cramped schedule' },
          },
        ],
        planItemsCount: 2,
      })
    );

    expect(result.primaryRecommendation).toMatchObject({
      kind: 'recovery',
      title: 'Keep today lighter',
      confidence: 'high',
      primaryAction: {
        kind: 'recovery-action',
        actionId: 'apply-recovery-workout',
      },
      secondaryAction: {
        kind: 'recovery-action',
        actionId: 'apply-recovery-meal',
      },
      supportingAction: {
        kind: 'open-journal-recovery-note',
        label: 'Capture recovery note',
      },
    });
    expect(result.primaryRecommendation?.provenance).not.toHaveLength(0);
  });

  it('prefers the planned workout when the day is calm and both meal and workout are queued', () => {
    const result = buildTodayIntelligence(
      createBaseInput({
        dailyRecord: {
          id: 'daily:2026-04-02',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          date: '2026-04-02',
          mood: 4,
          energy: 3,
          stress: 2,
          focus: 4,
          sleepHours: 7.5,
          sleepQuality: 4,
        },
        nutritionSummary: {
          calories: 320,
          protein: 24,
          fiber: 6,
          carbs: 34,
          fat: 8,
        },
        plannedMeal: {
          id: 'planned-meal-2',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          name: 'Greek yogurt bowl',
          mealType: 'breakfast',
          calories: 310,
          protein: 24,
          fiber: 6,
          carbs: 34,
          fat: 8,
          sourceName: 'Local catalog',
        },
        plannedWorkout: {
          id: 'slot-workout-1',
          title: 'Full body reset',
          subtitle: 'Recovery · 1 exercise · Quadriceps · Dumbbell',
          status: 'planned',
        },
        planItemsCount: 2,
      })
    );

    expect(result.primaryRecommendation).toMatchObject({
      kind: 'planned_workout',
      title: 'Keep Full body reset moving',
      confidence: 'medium',
      primaryAction: { kind: 'plan-status', label: 'Complete queued workout' },
    });
  });

  it('returns a neutral fallback state when there is no strong recommendation yet', () => {
    const result = buildTodayIntelligence(createBaseInput());

    expect(result.primaryRecommendation).toBeNull();
    expect(result.fallbackState).toMatchObject({
      title: 'No strong recommendation yet.',
      message: "Start with today's check-in to unlock the rest of Today.",
      action: { kind: 'href', href: '#today-check-in', label: 'Open check-in' },
    });
  });
});
