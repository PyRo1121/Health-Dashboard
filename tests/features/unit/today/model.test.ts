import { describe, expect, it } from 'vitest';
import type { TodaySnapshot } from '$lib/features/today/snapshot';
import {
  createDailyCheckinPayload,
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
    expect(
      createDailyCheckinPayload(snapshot.date, createTodayFormFromSnapshot(snapshot))
    ).toMatchObject({
      date: '2026-04-02',
      mood: 4,
      focus: 5,
    });
  });
});
