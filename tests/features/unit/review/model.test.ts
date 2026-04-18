import { describe, expect, it } from 'vitest';
import type { WeeklyReviewData } from '$lib/features/review/service';
import {
  createReviewDecisionCards,
  createReviewAdherenceAuditItems,
  createReviewAdherenceCards,
  createReviewExperimentCandidates,
  createReviewSavedExperimentVerdict,
  createReviewSections,
  createReviewTrendRows,
  createWeeklyRecommendationView,
} from '$lib/features/review/model';

describe('review model', () => {
  it('builds trend rows and review sections', () => {
    const weekly: WeeklyReviewData = {
      anchorDay: '2026-04-02',
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
          inferredCount: 0,
          tone: 'mixed',
          detail: '2 hits, 1 miss',
        },
        {
          label: 'Workouts',
          score: 100,
          completed: 1,
          missed: 0,
          pending: 0,
          inferredCount: 0,
          tone: 'steady',
          detail: '1 hit, 0 misses',
        },
      ],
      adherenceSignals: [
        'Meal miss: Teriyaki Chicken Casserole was skipped.',
        'Workout hit: Full body reset was completed as planned.',
      ],
      adherenceMatches: [
        {
          id: 'adherence-1',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          weekStart: '2026-03-31',
          planSlotId: 'slot-1',
          localDay: '2026-04-02',
          slotType: 'meal',
          slotTitle: 'Greek yogurt bowl',
          outcome: 'hit',
          matchSource: 'food-entry',
          matchedRecordId: 'food-1',
          confidence: 'inferred',
          reason: 'matched a logged meal on 2026-04-02.',
          fingerprint: 'fp-1',
        },
      ],
      grocerySignals: [
        'Potential waste: Teriyaki Chicken Casserole was missed after 1 grocery item had already been sourced.',
      ],
      deviceHighlights: ['Sleep duration: 8 hours on 2026-04-02'],
      assessmentSummary: ['WHO-5: Strong wellbeing (17)'],
      healthReferenceLinks: [],
      symptomReferenceLinks: [],
      healthHighlights: [],
      contextSignals: ['Low sleep and a written reflection both landed on 2026-04-02.'],
      contextCaptureLinkedEventIds: ['anxiety-1'],
      journalHighlights: [
        'Evening review on 2026-04-02: Crowded store and headache drained the afternoon.',
      ],
      journalReflectionLinkedEventIds: ['anxiety-1'],
      patternHighlights: ['Headache kept showing up in your notes on 2 days this week.'],
      whatChangedHighlights: ['Low sleep and a written reflection both landed on 2026-04-02.'],
      weeklyRecommendation: {
        decision: 'continue',
        title: 'Continue with Greek yogurt bowl',
        summary: 'This is the clearest candidate to keep because the week supported it.',
        confidence: 'medium',
        expectedImpact: 'Keep the next week simpler and more repeatable.',
        provenance: [
          'Low sleep and a written reflection both landed on 2026-04-02.',
          'protein target looks strong',
        ],
        actionLabel: 'Load food',
        target: { kind: 'food', id: 'food-catalog-1' },
      },
      weeklyDecisionCards: [
        {
          decision: 'continue',
          title: 'Greek yogurt bowl',
          detail: 'protein target looks strong',
          confidence: 'medium',
          expectedImpact: 'Keep the next week simpler and more repeatable.',
          provenance: ['protein target looks strong'],
          target: { kind: 'food', id: 'food-catalog-1' },
        },
      ],
      experimentCandidates: [
        {
          id: 'protein-at-breakfast',
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
      experimentOptions: ['Increase hydration tracking'],
    };

    expect(createReviewTrendRows(weekly)).toContain('Average mood: 4.2');
    expect(createReviewSections(weekly).map((section) => section.title)).toEqual([
      'What changed enough to matter',
      'Drift flags',
      'Assessment changes',
      'Health highlights',
      'Health references',
      'Context signals',
      'Journal excerpts',
      'Patterns to watch',
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
    expect(createReviewAdherenceAuditItems(weekly)).toEqual([
      {
        badge: 'Inferred',
        title: 'Greek yogurt bowl',
        detail: 'Meal inferred hit: matched a logged meal on 2026-04-02.',
        tone: 'steady',
      },
    ]);
    expect(createReviewDecisionCards(weekly)).toEqual([
      {
        badge: 'Continue',
        title: 'Greek yogurt bowl',
        detail: 'protein target looks strong.',
        confidenceLabel: 'Medium confidence',
        expectedImpact: 'Keep the next week simpler and more repeatable.',
        provenance: ['protein target looks strong'],
        href: '/nutrition?loadKind=food&loadId=food-catalog-1',
        actionLabel: 'Load food',
      },
    ]);
    expect(createWeeklyRecommendationView(weekly)).toEqual({
      badge: 'Continue',
      title: 'Continue with Greek yogurt bowl',
      summary: 'This is the clearest candidate to keep because the week supported it.',
      confidenceLabel: 'Medium confidence',
      expectedImpact: 'Keep the next week simpler and more repeatable.',
      provenance: [
        'Low sleep and a written reflection both landed on 2026-04-02.',
        'protein target looks strong',
      ],
      href: '/nutrition?loadKind=food&loadId=food-catalog-1',
      actionLabel: 'Load food',
    });
    expect(createReviewExperimentCandidates(weekly)).toEqual([
      {
        id: 'protein-at-breakfast',
        label: 'Increase protein at breakfast',
        summary:
          'Protein coverage is still inconsistent enough that breakfast is the cleanest place to improve it.',
        confidenceLabel: 'High confidence',
        expectedImpact: 'Raise protein consistency early in the day.',
        provenance: [
          'Protein coverage is still inconsistent enough that breakfast is the cleanest place to improve it.',
        ],
      },
    ]);
    expect(createReviewSavedExperimentVerdict(weekly)).toEqual({
      badge: 'Continue',
      label: 'Increase protein at breakfast',
      summary:
        'Protein coverage is still inconsistent enough that this experiment should stay in motion next week.',
      confidenceLabel: 'High confidence',
      expectedImpact: 'Protect morning protein consistency before chasing a new experiment.',
      provenance: ['Average protein this week: 83g.'],
    });
  });

  it('surfaces a dedicated health highlights section when weekly health signals are available', () => {
    const weekly: WeeklyReviewData = {
      anchorDay: '2026-04-02',
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
      adherenceMatches: [],
      grocerySignals: [],
      deviceHighlights: [],
      assessmentSummary: [],
      healthReferenceLinks: [
        {
          label: 'Metformin 500 MG Oral Tablet',
          href: 'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
        },
      ],
      symptomReferenceLinks: [
        {
          label: 'Headache',
          href: 'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
        },
      ],
      healthHighlights: ['Low sleep lined up with higher anxiety on 2026-04-02.'],
      contextSignals: ['Low sleep and a written reflection both landed on 2026-04-02.'],
      contextCaptureLinkedEventIds: ['anxiety-1'],
      journalHighlights: [
        'Evening review on 2026-04-02: Crowded store and headache drained the afternoon.',
      ],
      journalReflectionLinkedEventIds: ['anxiety-1'],
      patternHighlights: ['Headache kept showing up in your notes on 2 days this week.'],
      whatChangedHighlights: ['Low sleep lined up with higher anxiety on 2026-04-02.'],
      weeklyRecommendation: null,
      weeklyDecisionCards: [],
      experimentOptions: ['Increase hydration tracking'],
    };

    expect(createReviewSections(weekly).map((section) => section.title)).toContain(
      'Health highlights'
    );
    expect(createReviewSections(weekly).map((section) => section.title)).toContain(
      'Health references'
    );
    expect(
      createReviewSections(weekly).find((section) => section.title === 'Health references')?.items
    ).toEqual([
      {
        kind: 'medication',
        categoryLabel: 'Medication',
        label: 'Metformin 500 MG Oral Tablet',
        href: 'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=860975&mainSearchCriteria.v.dn=Metformin+500+MG+Oral+Tablet&informationRecipient.languageCode.c=en',
      },
      {
        kind: 'symptom',
        categoryLabel: 'Symptom',
        label: 'Headache',
        href: 'https://connect.medlineplus.gov/application?mainSearchCriteria.v.cs=2.16.840.1.113883.6.90&mainSearchCriteria.v.c=R51&mainSearchCriteria.v.dn=Headache&informationRecipient.languageCode.c=en',
      },
    ]);
    expect(createReviewSections(weekly).map((section) => section.title)).toContain(
      'Context signals'
    );
    expect(createReviewSections(weekly).map((section) => section.title)).toContain(
      'Journal excerpts'
    );
    expect(createReviewSections(weekly).map((section) => section.title)).toContain(
      'Patterns to watch'
    );
  });

  it('marks pending adherence as pending and adds journal intent actions only when context exists', () => {
    const weekly: WeeklyReviewData = {
      anchorDay: '2026-04-02',
      snapshot: {
        id: 'review:2026-03-31',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weekStart: '2026-03-31',
        headline: 'Mindful reset',
        daysTracked: 1,
        flags: [],
        correlations: [],
        experiment: undefined,
      },
      averageMood: 4,
      averageSleep: 7,
      averageProtein: 25,
      sobrietyStreak: 0,
      nutritionHighlights: [],
      nutritionStrategy: [],
      planningHighlights: [],
      adherenceScores: [
        {
          label: 'Overall',
          score: 0,
          completed: 0,
          missed: 0,
          pending: 2,
          inferredCount: 0,
          tone: 'mixed',
          detail: '2 items still pending',
        },
      ],
      adherenceSignals: [],
      adherenceMatches: [
        {
          id: 'adherence-pending',
          createdAt: '2026-04-02T08:00:00.000Z',
          updatedAt: '2026-04-02T08:00:00.000Z',
          weekStart: '2026-03-31',
          planSlotId: 'slot-1',
          localDay: '2026-04-02',
          slotType: 'meal',
          slotTitle: 'Greek yogurt bowl',
          outcome: 'pending',
          matchSource: 'food-entry',
          matchedRecordId: undefined,
          confidence: 'explicit',
          reason: 'still queued for later today',
          fingerprint: 'fp-pending',
        },
      ],
      grocerySignals: [],
      deviceHighlights: [],
      assessmentSummary: [],
      healthReferenceLinks: [],
      symptomReferenceLinks: [],
      healthHighlights: [],
      contextSignals: ['Low sleep and a written reflection both landed on 2026-04-02.'],
      contextCaptureLinkedEventIds: ['anxiety-1'],
      journalHighlights: [
        'Evening review on 2026-04-02: Crowded store and headache drained the afternoon.',
      ],
      journalReflectionLinkedEventIds: ['anxiety-1'],
      patternHighlights: [],
      whatChangedHighlights: [],
      weeklyRecommendation: null,
      weeklyDecisionCards: [],
      experimentOptions: [],
    };

    expect(createReviewAdherenceCards(weekly)).toEqual([
      {
        label: 'Overall',
        value: 'Pending',
        detail: '2 items still pending.',
        tone: 'mixed',
      },
    ]);
    expect(createReviewAdherenceAuditItems(weekly)).toEqual([]);

    const contextSection = createReviewSections(weekly).find(
      (section) => section.title === 'Context signals'
    );
    const journalSection = createReviewSections(weekly).find(
      (section) => section.title === 'Journal excerpts'
    );

    expect(contextSection).toMatchObject({
      actionLabel: 'Capture context note',
    });
    expect(contextSection?.actionHref).toMatch(/^\/journal\?intentId=/);
    expect(journalSection).toMatchObject({
      actionLabel: 'Write reflection',
    });
    expect(journalSection?.actionHref).toMatch(/^\/journal\?intentId=/);
  });

  it('maps plan fallback recommendations into a stable page view', () => {
    const weekly: WeeklyReviewData = {
      anchorDay: '2026-04-02',
      snapshot: {
        id: 'review:2026-03-31',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weekStart: '2026-03-31',
        headline: 'Mindful reset',
        daysTracked: 1,
        flags: [],
        correlations: [],
        experiment: undefined,
      },
      averageMood: 4,
      averageSleep: 7,
      averageProtein: 0,
      sobrietyStreak: 0,
      nutritionHighlights: [],
      nutritionStrategy: [],
      planningHighlights: ['This Week: 0/1 plan items completed, 1 skipped.'],
      adherenceScores: [],
      adherenceSignals: [],
      adherenceMatches: [],
      grocerySignals: [
        'Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced.',
      ],
      deviceHighlights: [],
      assessmentSummary: [],
      healthReferenceLinks: [],
      symptomReferenceLinks: [],
      healthHighlights: [],
      contextSignals: [],
      contextCaptureLinkedEventIds: [],
      journalHighlights: [],
      journalReflectionLinkedEventIds: [],
      patternHighlights: [],
      whatChangedHighlights: [
        'Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced.',
      ],
      weeklyRecommendation: {
        decision: 'adjust',
        title: 'Adjust the weekly plan before the next grocery cycle',
        summary:
          'The week surfaced enough grocery friction that the plan needs a tighter next pass.',
        confidence: 'medium',
        expectedImpact: 'Reduce waste and keep next-week execution cleaner.',
        provenance: [
          'Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced.',
        ],
        actionLabel: 'Open Plan',
        target: { kind: 'plan' },
      },
      weeklyDecisionCards: [],
      experimentOptions: ['Increase hydration tracking'],
    };

    expect(createWeeklyRecommendationView(weekly)).toEqual({
      badge: 'Adjust',
      title: 'Adjust the weekly plan before the next grocery cycle',
      summary: 'The week surfaced enough grocery friction that the plan needs a tighter next pass.',
      confidenceLabel: 'Medium confidence',
      expectedImpact: 'Reduce waste and keep next-week execution cleaner.',
      provenance: [
        'Potential waste: Teriyaki Chicken Casserole was missed after 2 grocery items had already been sourced.',
      ],
      href: '/plan',
      actionLabel: 'Open Plan',
    });
    expect(createReviewDecisionCards(weekly)).toEqual([]);
  });

  it('dedupes recommendation rationale lines while preserving the first-seen wording', () => {
    const weekly: WeeklyReviewData = {
      anchorDay: '2026-04-02',
      snapshot: {
        id: 'review:2026-03-31',
        createdAt: '2026-04-02T08:00:00.000Z',
        updatedAt: '2026-04-02T08:00:00.000Z',
        weekStart: '2026-03-31',
        headline: 'Mindful reset',
        daysTracked: 3,
        flags: [],
        correlations: [],
        experiment: 'Increase hydration tracking',
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
      adherenceMatches: [],
      grocerySignals: [],
      deviceHighlights: [],
      assessmentSummary: [],
      healthReferenceLinks: [],
      symptomReferenceLinks: [],
      healthHighlights: ['Low sleep lined up with higher anxiety on 2026-04-02.'],
      contextSignals: ['Low sleep and a written reflection both landed on 2026-04-02.'],
      contextCaptureLinkedEventIds: ['anxiety-1'],
      journalHighlights: [],
      journalReflectionLinkedEventIds: [],
      patternHighlights: [],
      whatChangedHighlights: ['Low sleep lined up with higher anxiety on 2026-04-02.'],
      weeklyRecommendation: {
        decision: 'adjust',
        title: 'Adjust the weekly plan before next week',
        summary: 'The week surfaced enough friction that the next pass needs a tighter experiment.',
        confidence: 'medium',
        expectedImpact: 'Reduce friction while keeping momentum.',
        provenance: [
          'Low sleep lined up with higher anxiety on 2026-04-02.',
          'low sleep lined up with higher anxiety on 2026-04-02.',
          'Low sleep and a written reflection both landed on 2026-04-02.',
        ],
        actionLabel: 'Open Plan',
        target: { kind: 'plan' },
      },
      weeklyDecisionCards: [
        {
          decision: 'adjust',
          title: 'Recovery walk',
          detail: 'Context pressure showed up around this plan item',
          confidence: 'medium',
          expectedImpact: 'Reduce friction while keeping momentum.',
          provenance: [
            'Context pressure showed up around this plan item',
            'context pressure showed up around this plan item',
            'Low sleep lined up with higher anxiety on 2026-04-02.',
          ],
          target: { kind: 'plan' },
        },
      ],
      experimentOptions: ['Increase hydration tracking'],
    };

    expect(createWeeklyRecommendationView(weekly)?.provenance).toEqual([
      'Low sleep lined up with higher anxiety on 2026-04-02.',
      'Low sleep and a written reflection both landed on 2026-04-02.',
    ]);
    expect(createReviewDecisionCards(weekly)[0]?.provenance).toEqual([
      'Context pressure showed up around this plan item',
      'Low sleep lined up with higher anxiety on 2026-04-02.',
    ]);
  });
});
