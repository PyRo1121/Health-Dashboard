import type { WeeklyReviewData } from '$lib/features/review/service';
import { REVIEW_EXPERIMENT_DEFINITIONS } from '$lib/features/review/experiment-registry';
import {
  buildNutritionIntentHref,
  type NutritionIntentHref,
} from '$lib/features/nutrition/navigation';

export type ReviewNavigationHref = NutritionIntentHref | '/plan';

export type ReviewDecisionCardView = {
  badge: 'Continue' | 'Adjust' | 'Stop';
  title: string;
  detail: string;
  confidenceLabel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  expectedImpact: string;
  provenance: string[];
  href: ReviewNavigationHref;
  actionLabel: string;
};

export type ReviewWeeklyRecommendationView = {
  badge: 'Continue' | 'Adjust' | 'Stop';
  title: string;
  summary: string;
  confidenceLabel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  expectedImpact: string;
  provenance: string[];
  href: ReviewNavigationHref;
  actionLabel: string;
} | null;

export type ReviewExperimentCandidateView = {
  id: string;
  label: string;
  summary: string;
  confidenceLabel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  expectedImpact: string;
  provenance: string[];
};

export type ReviewSavedExperimentVerdictView = {
  badge: 'Continue' | 'Adjust' | 'Stop';
  label: string;
  summary: string;
  confidenceLabel: 'High confidence' | 'Medium confidence' | 'Low confidence';
  expectedImpact: string;
  provenance: string[];
} | null;

export function resolveReviewNavigationHref(
  href: ReviewNavigationHref,
  resolveHref: (path: '/nutrition' | '/plan') => string
): string {
  if (href.startsWith('/nutrition?')) {
    return `${resolveHref('/nutrition')}${href.slice('/nutrition'.length)}`;
  }

  return resolveHref('/plan');
}

function toDecisionBadge(decision: 'continue' | 'adjust' | 'stop'): 'Continue' | 'Adjust' | 'Stop' {
  if (decision === 'continue') return 'Continue';
  if (decision === 'adjust') return 'Adjust';
  return 'Stop';
}

function toConfidenceLabel(
  confidence: 'high' | 'medium' | 'low'
): 'High confidence' | 'Medium confidence' | 'Low confidence' {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

function createReviewTargetHref(target: {
  kind: 'food' | 'recipe' | 'plan';
  id?: string;
}): ReviewNavigationHref {
  if (target.kind === 'food' && target.id) {
    return buildNutritionIntentHref({ kind: 'food', id: target.id });
  }

  if (target.kind === 'recipe' && target.id) {
    return buildNutritionIntentHref({ kind: 'recipe', id: target.id });
  }

  return '/plan';
}

function dedupeReviewLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

function normalizeStrategyDetail(detail: string): string {
  const trimmed = detail.trim();
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

export function createWeeklyRecommendationView(
  weekly: WeeklyReviewData | null
): ReviewWeeklyRecommendationView {
  if (!weekly?.weeklyRecommendation) {
    return null;
  }

  return {
    badge: toDecisionBadge(weekly.weeklyRecommendation.decision),
    title: weekly.weeklyRecommendation.title,
    summary: weekly.weeklyRecommendation.summary,
    confidenceLabel: toConfidenceLabel(weekly.weeklyRecommendation.confidence),
    expectedImpact: weekly.weeklyRecommendation.expectedImpact,
    provenance: dedupeReviewLines(weekly.weeklyRecommendation.provenance),
    href: createReviewTargetHref(weekly.weeklyRecommendation.target),
    actionLabel: weekly.weeklyRecommendation.actionLabel,
  };
}

export function createReviewExperimentCandidates(
  weekly: WeeklyReviewData | null
): ReviewExperimentCandidateView[] {
  if (!weekly) return [];

  if (weekly.experimentCandidates?.length) {
    return weekly.experimentCandidates.map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      summary: candidate.summary,
      confidenceLabel: toConfidenceLabel(candidate.confidence),
      expectedImpact: candidate.expectedImpact,
      provenance: dedupeReviewLines(candidate.provenance),
    }));
  }

  return weekly.experimentOptions.map((label) => ({
    id: REVIEW_EXPERIMENT_DEFINITIONS.find((definition) => definition.label === label)?.id ?? label,
    label,
    summary: 'Keep this experiment deterministic and narrow enough to measure next week.',
    confidenceLabel: 'Medium confidence',
    expectedImpact: 'Generate a cleaner signal for the next weekly review.',
    provenance: [],
  }));
}

export function createReviewSavedExperimentVerdict(
  weekly: WeeklyReviewData | null
): ReviewSavedExperimentVerdictView {
  if (!weekly?.savedExperimentVerdict) {
    return null;
  }

  return {
    badge: toDecisionBadge(weekly.savedExperimentVerdict.decision),
    label: weekly.savedExperimentVerdict.label,
    summary: weekly.savedExperimentVerdict.summary,
    confidenceLabel: toConfidenceLabel(weekly.savedExperimentVerdict.confidence),
    expectedImpact: weekly.savedExperimentVerdict.expectedImpact,
    provenance: dedupeReviewLines(weekly.savedExperimentVerdict.provenance),
  };
}

export function createReviewDecisionCards(
  weekly: WeeklyReviewData | null
): ReviewDecisionCardView[] {
  return weekly
    ? weekly.weeklyDecisionCards.map((card) => ({
        badge: toDecisionBadge(card.decision),
        title: card.title,
        detail: normalizeStrategyDetail(card.detail),
        confidenceLabel: toConfidenceLabel(card.confidence),
        expectedImpact: card.expectedImpact,
        provenance: dedupeReviewLines(card.provenance),
        href: createReviewTargetHref(card.target),
        actionLabel:
          card.target.kind === 'food'
            ? card.decision === 'stop'
              ? 'Review food'
              : 'Load food'
            : card.target.kind === 'recipe'
              ? card.decision === 'stop'
                ? 'Review recipe'
                : 'Load recipe'
              : 'Open Plan',
      }))
    : [];
}
