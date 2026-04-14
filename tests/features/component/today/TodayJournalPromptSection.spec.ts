import { cleanup, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import type { TodaySnapshot } from '$lib/features/today/snapshot';
import TodayJournalPromptSection from '../../../../src/lib/features/today/components/TodayJournalPromptSection.svelte';

function createSnapshot(overrides: Partial<TodaySnapshot> = {}): TodaySnapshot {
  return {
    date: '2026-04-14',
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
    events: [],
    latestJournalEntry: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('TodayJournalPromptSection', () => {
  it('renders the latest journal entry when one exists', () => {
    render(TodayJournalPromptSection, {
      snapshot: createSnapshot({
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
      }),
    });

    expect(screen.getByText('Journal prompt')).toBeTruthy();
    expect(screen.getByText('Morning note')).toBeTruthy();
    expect(screen.getByText('A calm start matters more than intensity today.')).toBeTruthy();
  });

  it('renders the default prompt when no journal entry exists', () => {
    render(TodayJournalPromptSection, {
      snapshot: createSnapshot(),
    });

    expect(
      screen.getByText('What grounded you today? Reflect on one moment of clarity.')
    ).toBeTruthy();
  });
});
