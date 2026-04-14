import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TodaySnapshot } from '$lib/features/today/snapshot';
import TodayRecommendationSection from '../../../../src/lib/features/today/components/TodayRecommendationSection.svelte';

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
        reasons: ['No journal context exists yet.'],
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
        secondaryAction: null,
        supportingAction: null,
      },
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
  document.body.innerHTML = '';
});

describe('TodayRecommendationSection', () => {
  it('uses the hash target from a supporting href action instead of hardcoding the scroll target', async () => {
    const onRecommendationAction = vi.fn();
    const target = document.createElement('div');
    target.id = 'nutrition-pulse-anchor';
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    render(TodayRecommendationSection, {
      snapshot: createSnapshot({
        intelligence: {
          primaryRecommendation: {
            ...createSnapshot().intelligence.primaryRecommendation!,
            supportingAction: {
              kind: 'href',
              label: 'Jump to nutrition pulse',
              href: '#nutrition-pulse-anchor',
            },
          },
          fallbackState: null,
        },
      }),
      recommendationSupportRows: [],
      onRecommendationAction,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Jump to nutrition pulse' }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(onRecommendationAction).not.toHaveBeenCalled();
  });

  it('renders fallback non-href actions as buttons and dispatches them through the callback', async () => {
    const onRecommendationAction = vi.fn();

    render(TodayRecommendationSection, {
      snapshot: createSnapshot({
        intelligence: {
          primaryRecommendation: null,
          fallbackState: {
            title: 'No strong recommendation yet.',
            message: 'Stay with the planned day and keep logging signals.',
            action: {
              kind: 'open-journal-context-capture',
              label: 'Capture context',
            },
          },
        },
      }),
      recommendationSupportRows: [],
      onRecommendationAction,
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Capture context' }));

    expect(onRecommendationAction).toHaveBeenCalledWith({
      kind: 'open-journal-context-capture',
      label: 'Capture context',
    });
  });
});
