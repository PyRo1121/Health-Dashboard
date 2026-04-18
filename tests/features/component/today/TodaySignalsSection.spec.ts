import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { TodaySnapshot } from '$lib/features/today/snapshot';
import TodaySignalsSection from '../../../../src/lib/features/today/components/TodaySignalsSection.svelte';

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
    plannedMeal: null,
    plannedMealIssue: null,
    plannedWorkout: null,
    plannedWorkoutIssue: null,
    recoveryAdaptation: null,
    intelligence: {
      primaryRecommendation: {
        id: 'recommendation-1',
        kind: 'context_capture',
        title: 'Capture context before the day gets noisy',
        summary: 'A quick note will make the rest of today easier to steer.',
        confidence: 'medium',
        score: 0.78,
        reasons: [
          'No journal context exists yet.',
          'You already have enough signal to add context.',
        ],
        provenance: [
          {
            label: 'No journal entry has been logged for today yet.',
            sourceKind: 'journal',
          },
        ],
        primaryAction: {
          kind: 'open-journal-context-capture',
          label: 'Capture context',
        },
        secondaryAction: {
          kind: 'href',
          label: 'Open Plan',
          href: '/plan',
        },
        supportingAction: {
          kind: 'href',
          label: 'Open Nutrition',
          href: '/nutrition',
        },
      },
      fallbackState: {
        title: 'No strong recommendation yet.',
        message: 'Stay with the planned day and keep logging signals.',
        action: { kind: 'href', label: 'Open check-in', href: '#today-check-in' },
      },
    },
    planItems: [],
    events: [],
    latestJournalEntry: {
      id: 'journal-1',
      createdAt: '2026-04-14T08:00:00.000Z',
      updatedAt: '2026-04-14T08:00:00.000Z',
      entryType: 'freeform',
      localDay: '2026-04-14',
      title: 'Morning note',
      body: 'A calm start matters more than intensity today.',
      tags: [],
      linkedEventIds: [],
    },
    ...overrides,
  };
}

describe('TodaySignalsSection', () => {
  it('renders the split recommendation, nutrition, and journal surfaces and wires action callbacks', async () => {
    const onRecommendationAction = vi.fn();

    render(TodaySignalsSection, {
      snapshot: createSnapshot(),
      todayNutritionPulseMetrics: [
        { label: 'Protein pace', current: 24, target: 80, projected: 48, tone: 'steady' },
        { label: 'Fiber pace', current: 6, target: 25, projected: 12, tone: 'boost' },
      ],
      todayNutritionGuidance: ['Protein is still low so far today.'],
      todayNutritionRows: ['Calories: 320', 'Protein: 24'],
      plannedMealProjectionRows: ['Projected protein: 48'],
      recommendationSupportRows: ['Nutrition: protein 24g, fiber 6g so far.'],
      onRecommendationAction,
    });

    expect(screen.getByText("Today's recommendation")).toBeTruthy();
    expect(screen.getByText('Capture context before the day gets noisy')).toBeTruthy();
    expect(screen.getByText('Medium confidence')).toBeTruthy();
    expect(screen.getByText('Why this is showing up')).toBeTruthy();
    expect(screen.getByText('Nutrition pulse')).toBeTruthy();
    expect(screen.getByText('Protein pace')).toBeTruthy();
    expect(screen.getByText('If you log the planned meal next:')).toBeTruthy();
    expect(screen.getByText('Journal prompt')).toBeTruthy();
    expect(screen.getByText('Morning note')).toBeTruthy();
    expect(screen.getByText('A calm start matters more than intensity today.')).toBeTruthy();

    await fireEvent.click(screen.getByRole('button', { name: 'Capture context' }));

    expect(onRecommendationAction).toHaveBeenCalledWith({
      kind: 'open-journal-context-capture',
      label: 'Capture context',
    });
  });

  it('renders the fallback recommendation state when no primary recommendation exists', () => {
    render(TodaySignalsSection, {
      snapshot: createSnapshot({
        intelligence: {
          primaryRecommendation: null,
          fallbackState: {
            title: 'No strong recommendation yet.',
            message: 'Stay with the planned day and keep logging signals.',
            action: { kind: 'href', label: 'Open Plan', href: '/plan' },
          },
        },
        latestJournalEntry: null,
      }),
      todayNutritionPulseMetrics: [
        { label: 'Protein pace', current: 24, target: 80, projected: null, tone: 'steady' },
      ],
      todayNutritionGuidance: ['Protein is still low so far today.'],
      todayNutritionRows: ['Calories: 320'],
      plannedMealProjectionRows: [],
      recommendationSupportRows: [],
      onRecommendationAction: vi.fn(),
    });

    expect(screen.getByText('No strong recommendation yet.')).toBeTruthy();
    expect(screen.getByText('Stay with the planned day and keep logging signals.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open Plan' })).toBeTruthy();
    expect(
      screen.getByText('What grounded you today? Reflect on one moment of clarity.')
    ).toBeTruthy();
  });

  it('renders explicit empty states when no today snapshot is available yet', () => {
    render(TodaySignalsSection, {
      snapshot: null,
      todayNutritionPulseMetrics: [],
      todayNutritionGuidance: [],
      todayNutritionRows: [],
      plannedMealProjectionRows: [],
      recommendationSupportRows: [],
      onRecommendationAction: vi.fn(),
    });

    expect(screen.getByText('No recommendation yet.')).toBeTruthy();
    expect(
      screen.getByText('Today will promote one next move when enough signal is available.')
    ).toBeTruthy();
    expect(screen.getByText('No nutrition signal yet.')).toBeTruthy();
    expect(screen.getByText('Meals and plans will show their intake impact here.')).toBeTruthy();
    expect(
      screen.getByText('What grounded you today? Reflect on one moment of clarity.')
    ).toBeTruthy();
  });
});
