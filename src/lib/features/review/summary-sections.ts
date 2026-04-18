import type { WeeklyReviewData } from '$lib/features/review/service';
import {
  buildStoredJournalIntentHref,
  type JournalIntentHref,
} from '$lib/features/journal/navigation';
import {
  buildNutritionIntentHref,
  type NutritionIntentHref,
} from '$lib/features/nutrition/navigation';

export type ReviewSection = {
  kind?: 'default' | 'decision-engine';
  title: string;
  items: Array<string | ReviewReferenceItem>;
  emptyTitle?: string;
  emptyMessage?: string;
  emphasis?: 'default' | 'strategy';
  actionHref?: JournalIntentHref;
  actionLabel?: string;
};

export type ReviewReferenceItem = {
  kind: 'medication' | 'symptom';
  categoryLabel: 'Medication' | 'Symptom';
  label: string;
  href: string;
};

export type ReviewNutritionStrategyCard = {
  badge: string;
  title: string;
  detail: string;
  href: NutritionIntentHref;
  actionLabel: string;
};

export type ReviewAdherenceCard = {
  label: string;
  value: string;
  detail: string;
  tone: 'steady' | 'mixed' | 'attention';
};

export type ReviewAdherenceAuditItem = {
  badge: 'Explicit' | 'Inferred';
  title: string;
  detail: string;
  tone: 'steady' | 'mixed' | 'attention';
};

function createReferenceItems(
  kind: ReviewReferenceItem['kind'],
  categoryLabel: ReviewReferenceItem['categoryLabel'],
  items: Array<{ label: string; href: string }>
): ReviewReferenceItem[] {
  return items.map((item) => ({
    kind,
    categoryLabel,
    label: item.label,
    href: item.href,
  }));
}

function normalizeStrategyDetail(detail: string): string {
  const trimmed = detail.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function createNutritionStrategyLine(item: WeeklyReviewData['nutritionStrategy'][number]): string {
  const prefix = item.kind === 'repeat' ? 'Repeat' : item.kind === 'rotate' ? 'Rotate in' : 'Skip';
  return `${prefix}: ${item.title} — ${normalizeStrategyDetail(item.detail)}`;
}

function createReviewJournalIntentHref(
  weekly: WeeklyReviewData,
  input: {
    entryType: 'evening_review' | 'symptom_note';
    title: string;
    body: string;
    linkedEventIds: string[];
  }
): JournalIntentHref {
  return buildStoredJournalIntentHref({
    source: 'review-context',
    localDay: weekly.anchorDay,
    entryType: input.entryType,
    title: input.title,
    body: input.body,
    linkedEventIds: input.linkedEventIds,
  });
}

export function createReviewTrendRows(weekly: WeeklyReviewData | null): string[] {
  return weekly
    ? [
        `Average mood: ${weekly.averageMood}`,
        `Average sleep: ${weekly.averageSleep} hours`,
        `Average protein: ${weekly.averageProtein}g`,
        `Sobriety streak: ${weekly.sobrietyStreak} day${weekly.sobrietyStreak === 1 ? '' : 's'}`,
      ]
    : [];
}

export function createNutritionStrategyCards(
  weekly: WeeklyReviewData | null
): ReviewNutritionStrategyCard[] {
  return weekly
    ? weekly.nutritionStrategy.map((item) => ({
        badge: item.kind === 'repeat' ? 'Repeat' : item.kind === 'rotate' ? 'Rotate in' : 'Skip',
        title: item.title,
        detail: normalizeStrategyDetail(item.detail),
        href: buildNutritionIntentHref({
          kind: item.recommendationKind,
          id: item.recommendationId,
        }),
        actionLabel:
          item.kind === 'skip'
            ? item.recommendationKind === 'food'
              ? 'Review food'
              : 'Review recipe'
            : item.recommendationKind === 'food'
              ? 'Load food'
              : 'Load recipe',
      }))
    : [];
}

export function createReviewAdherenceCards(weekly: WeeklyReviewData | null): ReviewAdherenceCard[] {
  return weekly
    ? weekly.adherenceScores.map((score) => ({
        label: score.label,
        value:
          score.completed === 0 && score.missed === 0 && score.pending > 0
            ? 'Pending'
            : `${score.score}%`,
        detail: normalizeStrategyDetail(score.detail),
        tone: score.tone,
      }))
    : [];
}

function toneForOutcome(
  outcome: WeeklyReviewData['adherenceMatches'][number]['outcome']
): ReviewAdherenceAuditItem['tone'] {
  if (outcome === 'hit') return 'steady';
  if (outcome === 'miss') return 'attention';
  return 'mixed';
}

export function createReviewAdherenceAuditItems(
  weekly: WeeklyReviewData | null
): ReviewAdherenceAuditItem[] {
  return weekly
    ? weekly.adherenceMatches
        .filter((match) => match.outcome !== 'pending')
        .map((match) => {
          const badge: ReviewAdherenceAuditItem['badge'] =
            match.confidence === 'explicit' ? 'Explicit' : 'Inferred';

          return {
            badge,
            title: match.slotTitle,
            detail:
              (match.slotType === 'meal'
                ? 'Meal'
                : match.slotType === 'workout'
                  ? 'Workout'
                  : 'Note') +
              `${match.confidence === 'inferred' ? ' inferred' : ''} ${match.outcome}: ${match.reason}`,
            tone: toneForOutcome(match.outcome),
          };
        })
        .slice(0, 6)
    : [];
}

export function createReviewSections(weekly: WeeklyReviewData | null): ReviewSection[] {
  return weekly
    ? [
        {
          kind: 'default',
          title: 'What changed enough to matter',
          items: weekly.whatChangedHighlights,
          emptyMessage: 'The week does not yet have enough movement to call out a clear shift.',
        },
        {
          kind: 'default',
          title: 'Drift flags',
          items: weekly.snapshot.flags,
          emptyTitle: 'No major drift flagged.',
          emptyMessage: 'Keep logging for a fuller weekly signal.',
        },
        {
          kind: 'default',
          title: 'Assessment changes',
          items: weekly.assessmentSummary,
          emptyMessage: 'No completed assessment changes this week yet.',
        },
        {
          kind: 'default',
          title: 'Health highlights',
          items: weekly.healthHighlights,
          emptyMessage: 'Keep logging health context to unlock more useful weekly patterns.',
        },
        {
          kind: 'default',
          title: 'Health references',
          items: [
            ...createReferenceItems('medication', 'Medication', weekly.healthReferenceLinks ?? []),
            ...createReferenceItems('symptom', 'Symptom', weekly.symptomReferenceLinks ?? []),
          ],
          emptyMessage:
            'Log medications or suggested symptoms with reference links to surface trusted reading here during Review.',
        },
        {
          kind: 'default',
          title: 'Context signals',
          items: weekly.contextSignals,
          emptyMessage:
            'Journal and health context need more overlap before this section becomes useful.',
          actionLabel: weekly.contextSignals.length ? 'Capture context note' : undefined,
          actionHref: weekly.contextSignals.length
            ? createReviewJournalIntentHref(weekly, {
                entryType: 'symptom_note',
                title: 'Weekly context note',
                body: [
                  'Weekly context note.',
                  '',
                  ...weekly.contextSignals.map((line) => `- ${line}`),
                  '',
                  'What happened behind these signals? What should you watch next week?',
                ].join('\n'),
                linkedEventIds: weekly.contextCaptureLinkedEventIds,
              })
            : undefined,
        },
        {
          kind: 'default',
          title: 'Journal excerpts',
          items: weekly.journalHighlights,
          emptyMessage: 'Write one useful reflection this week and Review will surface it here.',
          actionLabel: weekly.journalHighlights.length ? 'Write reflection' : undefined,
          actionHref: weekly.journalHighlights.length
            ? createReviewJournalIntentHref(weekly, {
                entryType: 'evening_review',
                title: 'Follow-up reflection',
                body: [
                  'Follow-up reflection.',
                  '',
                  weekly.journalHighlights[0] ?? '',
                  '',
                  'What felt true? What should you carry forward next week?',
                ].join('\n'),
                linkedEventIds: weekly.journalReflectionLinkedEventIds,
              })
            : undefined,
        },
        {
          kind: 'default',
          title: 'Patterns to watch',
          items: weekly.patternHighlights,
          emptyMessage:
            'Repeat a few linked context notes before Review can surface recurring patterns.',
        },
        {
          kind: 'default',
          title: 'Food adherence highlights',
          items: weekly.nutritionHighlights,
          emptyMessage: 'Nutrition needs a few more logged meals before highlights mean much.',
        },
        {
          kind: 'default',
          title: 'Plan follow-through',
          items: weekly.planningHighlights,
          emptyMessage: 'Build a weekly plan before Review can compare intent against execution.',
        },
        {
          kind: 'default',
          title: 'Actual vs plan',
          items: weekly.adherenceSignals,
          emptyMessage:
            'Complete or miss a few plan items before Review can judge real follow-through.',
        },
        {
          kind: 'default',
          title: 'Grocery misses / waste',
          items: weekly.grocerySignals,
          emptyMessage: 'No grocery misses or waste signals surfaced this week.',
        },
        {
          kind: 'decision-engine',
          title: 'Repeat / rotate / skip next week',
          items: weekly.nutritionStrategy.map(createNutritionStrategyLine),
          emptyMessage:
            'Save more foods or recipes in Nutrition before the app can suggest what to repeat or rotate.',
          emphasis: 'strategy',
        },
        {
          kind: 'default',
          title: 'Device highlights',
          items: weekly.deviceHighlights,
          emptyMessage:
            'Import an iPhone companion bundle to bring passive device signals into review.',
        },
      ]
    : [];
}
