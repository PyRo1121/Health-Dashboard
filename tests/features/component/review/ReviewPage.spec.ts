import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyReviewData } from '$lib/features/review/service';
import type { ReviewPageState } from '$lib/features/review/controller';
import type { ReviewSnapshot } from '$lib/core/domain/types';

const reviewClientMock = vi.hoisted(() => {
  let loadState: ReviewPageState | null = null;

  return {
    setLoadState(state: ReviewPageState) {
      loadState = structuredClone(state);
    },
    readLoadState() {
      if (!loadState) {
        throw new Error('Review test state was not configured before rendering the page.');
      }

      return structuredClone(loadState);
    },
  };
});

vi.mock('$lib/features/review/client', async () => {
  const actual = await vi.importActual<typeof import('$lib/features/review/client')>(
    '$lib/features/review/client'
  );

  return {
    ...actual,
    loadReviewPage: vi.fn(async () => reviewClientMock.readLoadState()),
    saveReviewExperimentPage: vi.fn(async (state: ReviewPageState) => {
      const selectedCandidate = state.weekly?.experimentCandidates?.find(
        (candidate) => readCandidateId(candidate) === state.selectedExperiment
      );
      const nextWeekly = state.weekly
        ? {
            ...state.weekly,
            snapshot: {
              ...state.weekly.snapshot,
              experiment: selectedCandidate?.label ?? state.weekly.snapshot.experiment,
              experimentId: selectedCandidate?.id ?? state.weekly.snapshot.experimentId,
              updatedAt: '2026-04-04T16:00:00.000Z',
            },
          }
        : null;

      return {
        ...state,
        weekly: nextWeekly,
        saveNotice: 'Experiment saved.',
      };
    }),
  };
});

import ReviewPage from '../../../../src/routes/review/+page.svelte';

function readCandidateId(candidate: unknown): string | undefined {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const { id } = candidate as { id?: unknown };
  return typeof id === 'string' ? id : undefined;
}

function buildReviewState(weekly: WeeklyReviewData): ReviewPageState {
  return {
    loading: false,
    localDay: weekly.anchorDay,
    weekly,
    selectedExperiment:
      readCandidateId(weekly.experimentCandidates?.[0]) ?? weekly.experimentOptions[0] ?? '',
    loadNotice: '',
    saveNotice: '',
  };
}

function getSection(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: title });
  const section = heading.closest('section');
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Expected section wrapper for ${title}`);
  }

  return section;
}

function buildWeeklyData(
  overrides: Omit<Partial<WeeklyReviewData>, 'snapshot'> & {
    snapshot?: Partial<ReviewSnapshot>;
  } = {}
): WeeklyReviewData {
  const { snapshot: snapshotOverrides, ...restOverrides } = overrides;

  return {
    anchorDay: '2026-04-04',
    snapshot: {
      id: 'review:2026-03-30',
      createdAt: '2026-04-04T08:00:00.000Z',
      updatedAt: '2026-04-04T08:00:00.000Z',
      weekStart: '2026-03-30',
      headline: 'Mindful reset',
      daysTracked: 2,
      flags: [],
      correlations: [
        {
          label: 'Higher sleep tracked with better mood',
          detail: 'Sleep was steadier on the strongest mood day.',
          sourceDays: ['2026-04-02'],
        },
      ],
      experiment: undefined,
      ...snapshotOverrides,
    },
    averageMood: 4,
    averageSleep: 7,
    averageProtein: 57.5,
    sobrietyStreak: 1,
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
    planningHighlights: [
      'This Week: 1/2 plan items completed.',
      'Groceries: 1/2 checked, 1 on hand, 1 excluded.',
    ],
    adherenceScores: [
      {
        label: 'Overall',
        score: 50,
        completed: 1,
        missed: 1,
        pending: 0,
        inferredCount: 1,
        tone: 'mixed',
        detail: '1 hit, 1 miss, 1 inferred',
      },
      {
        label: 'Meals',
        score: 100,
        completed: 1,
        missed: 0,
        pending: 0,
        inferredCount: 0,
        tone: 'steady',
        detail: '1 hit, 0 misses',
      },
      {
        label: 'Workouts',
        score: 0,
        completed: 0,
        missed: 1,
        pending: 0,
        inferredCount: 1,
        tone: 'attention',
        detail: '0 hits, 1 miss, 1 inferred',
      },
    ],
    adherenceSignals: [
      'Meal hit: Teriyaki Chicken Casserole was completed as planned.',
      'Workout inferred miss: Recovery walk had no matching completion record.',
    ],
    adherenceMatches: [
      {
        id: 'adherence-1',
        createdAt: '2026-04-04T08:00:00.000Z',
        updatedAt: '2026-04-04T08:00:00.000Z',
        weekStart: '2026-03-30',
        planSlotId: 'slot-1',
        localDay: '2026-04-02',
        slotType: 'meal',
        slotTitle: 'Greek yogurt bowl',
        outcome: 'hit',
        matchSource: 'food-entry',
        matchedRecordId: 'food-entry-1',
        confidence: 'inferred',
        reason: 'matched a logged meal on 2026-04-02.',
        fingerprint: 'fp-1',
      },
    ],
    grocerySignals: [],
    deviceHighlights: ['Sleep duration: 8 hours on 2026-04-02'],
    assessmentSummary: ['WHO-5: Strong wellbeing (17)'],
    healthHighlights: ['Low sleep lined up with higher anxiety on 2026-03-31.'],
    contextSignals: ['Low sleep and a written reflection both landed on 2026-03-31.'],
    contextCaptureLinkedEventIds: ['anxiety-1'],
    journalHighlights: [
      'Evening review on 2026-03-31: Crowded store and headache drained the afternoon.',
    ],
    journalReflectionLinkedEventIds: ['anxiety-1'],
    patternHighlights: ['Headache kept showing up in your notes on 2 days this week.'],
    whatChangedHighlights: [
      'Low sleep lined up with higher anxiety on 2026-03-31.',
      'Step count: 8432 count on 2026-04-02',
    ],
    weeklyRecommendation: {
      decision: 'continue',
      title: 'Continue with Greek yogurt bowl',
      summary: 'The week backed this up with enough signal to keep it in the next cycle.',
      confidence: 'high',
      expectedImpact: 'Carry forward the strongest repeatable win from this week.',
      provenance: [
        'protein target looks strong',
        'Low sleep lined up with higher anxiety on 2026-03-31.',
        'Step count: 8432 count on 2026-04-02',
      ],
      actionLabel: 'Load food',
      target: { kind: 'food', id: 'food-catalog-1' },
    },
    weeklyDecisionCards: [
      {
        decision: 'continue',
        title: 'Greek yogurt bowl',
        detail: 'protein target looks strong',
        confidence: 'high',
        expectedImpact: 'Carry forward the strongest repeatable win from this week.',
        provenance: ['protein target looks strong'],
        target: { kind: 'food', id: 'food-catalog-1' },
      },
      {
        decision: 'stop',
        title: 'Teriyaki Chicken Casserole',
        detail: 'skipped in the weekly plan',
        confidence: 'medium',
        expectedImpact: 'Remove the part of the plan the week did not support.',
        provenance: ['skipped in the weekly plan'],
        target: { kind: 'recipe', id: 'themealdb:52772' },
      },
    ],
    experimentCandidates: [
      {
        id: 'mindfulness-10min-morning',
        label: 'Try 10 min morning mindfulness',
        summary: 'Low sleep and stress patterns still justify a short reset experiment.',
        confidence: 'medium',
        expectedImpact: 'Reduce early-day stress carry-over.',
        provenance: ['Low sleep and stress patterns still justify a short reset experiment.'],
      },
      {
        id: 'hydration-tracking',
        label: 'Increase hydration tracking',
        summary:
          'The week has enough recovery noise that hydration tracking can sharpen the signal.',
        confidence: 'medium',
        expectedImpact: 'Improve recovery signal quality before the next review.',
        provenance: [
          'The week has enough recovery noise that hydration tracking can sharpen the signal.',
        ],
      },
      {
        id: 'protein-breakfast',
        label: 'Increase protein at breakfast',
        summary:
          'Protein coverage is still inconsistent enough that breakfast is the cleanest place to improve it.',
        confidence: 'high',
        expectedImpact: 'Raise protein consistency early in the day.',
        provenance: [
          'Protein coverage is still inconsistent enough that breakfast is the cleanest place to improve it.',
        ],
      },
    ] as never,
    savedExperimentVerdict: {
      decision: 'continue',
      label: 'Increase protein at breakfast',
      summary:
        'Protein coverage is still inconsistent enough that this experiment should stay in motion next week.',
      confidence: 'high',
      expectedImpact: 'Protect morning protein consistency before chasing a new experiment.',
      provenance: ['Average protein this week: 83g.'],
    },
    experimentOptions: [
      'Try 10 min morning mindfulness',
      'Increase hydration tracking',
      'Increase protein at breakfast',
    ],
    ...restOverrides,
  };
}

describe('Review route', () => {
  beforeEach(() => {
    reviewClientMock.setLoadState(
      buildReviewState(
        buildWeeklyData({
          snapshot: {
            headline: 'Need more data to build your first weekly briefing',
            daysTracked: 0,
          },
          nutritionHighlights: [],
          nutritionStrategy: [],
          planningHighlights: [],
          adherenceScores: [],
          adherenceSignals: [],
          adherenceMatches: [],
          grocerySignals: [],
          deviceHighlights: [],
          assessmentSummary: [],
          healthHighlights: [],
          contextSignals: [],
          contextCaptureLinkedEventIds: [],
          journalHighlights: [],
          journalReflectionLinkedEventIds: [],
          patternHighlights: [],
          whatChangedHighlights: [],
          weeklyRecommendation: null,
          weeklyDecisionCards: [],
        })
      )
    );
  });

  it('renders a sparse weekly fallback without a decision hero', async () => {
    const weekly = buildWeeklyData({
      snapshot: {
        headline: 'Mindful reset',
        daysTracked: 1,
      },
      averageProtein: 0,
      nutritionHighlights: [],
      nutritionStrategy: [],
      planningHighlights: [],
      adherenceScores: [],
      adherenceSignals: [],
      adherenceMatches: [],
      grocerySignals: [],
      deviceHighlights: [],
      assessmentSummary: [],
      healthHighlights: [],
      contextSignals: [],
      contextCaptureLinkedEventIds: [],
      journalHighlights: [],
      journalReflectionLinkedEventIds: [],
      patternHighlights: [],
      whatChangedHighlights: [],
      weeklyRecommendation: null,
      weeklyDecisionCards: [],
    });
    reviewClientMock.setLoadState(buildReviewState(weekly));

    render(ReviewPage);

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeTruthy();
    const headlineSection = await waitFor(() => getSection('Weekly headline'));
    const strategySection = getSection('Decision engine actions');

    expect(within(headlineSection).getByText(/Tracked days: 1/i)).toBeTruthy();
    expect(within(headlineSection).queryByText(/Local-first recommendation/i)).toBeNull();
    expect(
      within(strategySection).getByText(
        /Save more foods or recipes in Nutrition before the app can suggest what to repeat or rotate\./i
      )
    ).toBeTruthy();
  });

  it('renders a deterministic recommendation and saves the next-week experiment', async () => {
    reviewClientMock.setLoadState(buildReviewState(buildWeeklyData()));

    render(ReviewPage);

    const headlineSection = await waitFor(() => getSection('Weekly headline'));
    const deviceSection = getSection('Device highlights');
    const strategySection = getSection('Decision engine actions');
    const experimentSelect = screen.getByLabelText('Next-week experiment') as HTMLSelectElement;

    expect(within(headlineSection).getByText(/Local-first recommendation/i)).toBeTruthy();
    expect(within(headlineSection).getByText(/Continue with Greek yogurt bowl/i)).toBeTruthy();
    expect(within(headlineSection).getByText(/High confidence/i)).toBeTruthy();
    expect(
      within(headlineSection).getByText(/Primary signal: protein target looks strong/i)
    ).toBeTruthy();
    expect(within(deviceSection).getByText(/Sleep duration: 8 hours on 2026-04-02/i)).toBeTruthy();
    expect(within(strategySection).getByText('Stop')).toBeTruthy();
    expect(
      within(headlineSection).getByRole('link', { name: 'Load food' }).getAttribute('href')
    ).toMatch(/^\/nutrition\?loadKind=food&loadId=food-catalog-1$/);
    expect(Array.from(experimentSelect.options, (option) => option.text)).toEqual([
      'Try 10 min morning mindfulness',
      'Increase hydration tracking',
      'Increase protein at breakfast',
    ]);
    expect(Array.from(experimentSelect.options, (option) => option.value)).toEqual([
      'mindfulness-10min-morning',
      'hydration-tracking',
      'protein-breakfast',
    ]);
    expect(experimentSelect.value).toBe('mindfulness-10min-morning');
    const experimentSection = getSection('Next-week experiment');
    expect(
      within(experimentSection).getByText(/Current verdict on saved experiment/i)
    ).toBeTruthy();
    expect(
      within(experimentSection).getAllByText(/Increase protein at breakfast/i).length
    ).toBeGreaterThan(0);
    expect(
      within(experimentSection).getByText(
        /Protein coverage is still inconsistent enough that this experiment should stay in motion next week\./i
      )
    ).toBeTruthy();
    expect(
      within(experimentSection).getAllByText(
        /The week has enough recovery noise that hydration tracking can sharpen the signal\./i
      ).length
    ).toBeGreaterThan(0);

    await fireEvent.change(experimentSelect, {
      target: { value: 'hydration-tracking' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save experiment' }));

    await waitFor(() => {
      expect(screen.getByText(/Experiment saved\./i)).toBeTruthy();
    });
    expect(experimentSelect.value).toBe('hydration-tracking');
    expect(screen.getByText('Saved experiment: Increase hydration tracking')).toBeTruthy();
  });

  it('labels inferred adherence explicitly inside the review audit', async () => {
    reviewClientMock.setLoadState(buildReviewState(buildWeeklyData()));

    render(ReviewPage);

    const adherenceSection = await waitFor(() => getSection('Actual adherence'));
    expect(within(adherenceSection).getByText(/1 hit, 1 miss, 1 inferred\./i)).toBeTruthy();
    expect(within(adherenceSection).getByText('Inferred')).toBeTruthy();
    expect(within(adherenceSection).getByText('Greek yogurt bowl')).toBeTruthy();
    expect(
      within(adherenceSection).getByText(
        /Meal inferred hit: matched a logged meal on 2026-04-02\./i
      )
    ).toBeTruthy();
  });

  it('renders a stop action for a skipped meal plan', async () => {
    reviewClientMock.setLoadState(
      buildReviewState(
        buildWeeklyData({
          weeklyRecommendation: {
            decision: 'stop',
            title: 'Stop planning Teriyaki Chicken Casserole',
            summary: 'The week produced enough misses to make this the clearest thing to remove.',
            confidence: 'high',
            expectedImpact: 'Cut avoidable misses and wasted effort out of the next week.',
            provenance: [
              'skipped in the weekly plan',
              'Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced.',
            ],
            actionLabel: 'Review recipe',
            target: { kind: 'recipe', id: 'themealdb:52772' },
          },
        })
      )
    );

    render(ReviewPage);

    const strategySection = await waitFor(() => getSection('Decision engine actions'));
    expect(within(strategySection).getByText('Stop')).toBeTruthy();
    expect(within(strategySection).getByText(/skipped in the weekly plan\./i)).toBeTruthy();
    expect(within(strategySection).getByText(/Medium confidence/i)).toBeTruthy();
    expect(within(strategySection).getByRole('link', { name: 'Review recipe' })).toBeTruthy();
  });

  it('does not repeat supporting evidence that already has a dedicated section', async () => {
    reviewClientMock.setLoadState(buildReviewState(buildWeeklyData()));

    render(ReviewPage);

    const headlineSection = await waitFor(() => getSection('Weekly headline'));
    const whatChangedSection = getSection('What changed enough to matter');
    const contextSection = getSection('Context signals');

    expect(
      within(whatChangedSection).getByText(
        /Low sleep lined up with higher anxiety on 2026-03-31\./i
      )
    ).toBeTruthy();
    expect(
      within(contextSection).getByText(
        /Low sleep and a written reflection both landed on 2026-03-31\./i
      )
    ).toBeTruthy();
    expect(
      within(headlineSection).queryByText(
        /^Low sleep lined up with higher anxiety on 2026-03-31\.$/i
      )
    ).toBeNull();
  });
});
