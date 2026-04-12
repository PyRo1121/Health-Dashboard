import type { WeeklyReviewData } from '$lib/features/review/service';
import { buildStoredJournalIntentHref, type JournalIntentHref } from '$lib/features/journal/navigation';
import {
  buildNutritionIntentHref,
  type NutritionIntentHref,
} from '$lib/features/nutrition/navigation';

export type ReviewSection = {
  title: string;
  items: string[];
  emptyTitle?: string;
  emptyMessage?: string;
  emphasis?: 'default' | 'strategy';
  actionHref?: JournalIntentHref;
  actionLabel?: string;
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
          title: 'Drift flags',
          items: weekly.snapshot.flags,
          emptyTitle: 'No major drift flagged.',
          emptyMessage: 'Keep logging for a fuller weekly signal.',
        },
        {
          title: 'Assessment changes',
          items: weekly.assessmentSummary,
          emptyMessage: 'No completed assessment changes this week yet.',
        },
        {
          title: 'Health highlights',
          items: weekly.healthHighlights,
          emptyMessage: 'Keep logging health context to unlock more useful weekly patterns.',
        },
        {
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
          title: 'Food adherence highlights',
          items: weekly.nutritionHighlights,
          emptyMessage: 'Nutrition needs a few more logged meals before highlights mean much.',
        },
        {
          title: 'Plan follow-through',
          items: weekly.planningHighlights,
          emptyMessage: 'Build a weekly plan before Review can compare intent against execution.',
        },
        {
          title: 'Actual vs plan',
          items: weekly.adherenceSignals,
          emptyMessage:
            'Complete or miss a few plan items before Review can judge real follow-through.',
        },
        {
          title: 'Grocery misses / waste',
          items: weekly.grocerySignals,
          emptyMessage: 'No grocery misses or waste signals surfaced this week.',
        },
        {
          title: 'Repeat / rotate / skip next week',
          items: weekly.nutritionStrategy.map(createNutritionStrategyLine),
          emptyMessage:
            'Save more foods or recipes in Nutrition before the app can suggest what to repeat or rotate.',
          emphasis: 'strategy',
        },
        {
          title: 'Device highlights',
          items: weekly.deviceHighlights,
          emptyMessage:
            'Import an iPhone companion bundle to bring passive device signals into review.',
        },
      ]
    : [];
}
