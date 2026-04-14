import type { ReviewSnapshot } from '$lib/core/domain/types';
import {
  clampNumber,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
  type ReviewExperimentCandidate,
  type ReviewSavedExperimentVerdict,
  takeUniqueStrings,
} from './analytics-shared';
import {
  reviewExperimentDefinitionById,
  reviewExperimentIdFromLabel,
  type ReviewExperimentId,
} from './experiment-registry';
import type {
  WeeklyReviewData,
  ReviewDecision,
  ReviewDecisionCard,
  ReviewRecommendationTarget,
  ReviewWeeklyRecommendation,
} from './analytics';

export type RecommendationEngineInput = {
  snapshot: WeeklyReviewData['snapshot'];
  averageSleep: number;
  averageProtein: number;
  nutritionStrategy: WeeklyReviewData['nutritionStrategy'];
  nutritionHighlights: WeeklyReviewData['nutritionHighlights'];
  planningHighlights: WeeklyReviewData['planningHighlights'];
  adherenceScores: WeeklyReviewData['adherenceScores'];
  adherenceSignals: WeeklyReviewData['adherenceSignals'];
  grocerySignals: WeeklyReviewData['grocerySignals'];
  deviceHighlights: WeeklyReviewData['deviceHighlights'];
  assessmentSummary: WeeklyReviewData['assessmentSummary'];
  healthHighlights: WeeklyReviewData['healthHighlights'];
  contextSignals: WeeklyReviewData['contextSignals'];
  patternHighlights: WeeklyReviewData['patternHighlights'];
  whatChangedHighlights: WeeklyReviewData['whatChangedHighlights'];
};

export type ReviewRecommendationCandidate = ReviewWeeklyRecommendation & {
  score: number;
  card: ReviewDecisionCard;
};

export function buildReviewRecommendationTarget(input: {
  kind: 'food' | 'recipe' | 'plan';
  id?: string;
}): ReviewRecommendationTarget {
  return input;
}

export function toDecision(kind: 'repeat' | 'rotate' | 'skip'): ReviewDecision {
  if (kind === 'repeat') return 'continue';
  if (kind === 'rotate') return 'adjust';
  return 'stop';
}

export function toTargetFromStrategy(
  item: WeeklyReviewData['nutritionStrategy'][number]
): ReviewRecommendationTarget {
  return buildReviewRecommendationTarget({
    kind: item.recommendationKind,
    id: item.recommendationId,
  });
}

export function dedupeRecommendationLines(
  lines: Array<string | null | undefined>,
  limit: number
): string[] {
  return takeUniqueStrings(lines, limit);
}

export function ensureSentence(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return '';
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

export function findAdherenceScore(
  scores: WeeklyReviewData['adherenceScores'],
  label: 'Overall' | 'Meals' | 'Workouts'
): WeeklyReviewData['adherenceScores'][number] | null {
  return scores.find((score) => score.label === label) ?? null;
}

export function deriveRecommendationConfidence(input: {
  score: number;
  evidenceCount: number;
  inferredCount: number;
}): ReviewWeeklyRecommendation['confidence'] {
  if (input.score >= 80 && input.evidenceCount >= 3 && input.inferredCount <= 1) {
    return 'high';
  }

  if (input.score >= 55 && input.evidenceCount >= 2) {
    return 'medium';
  }

  return 'low';
}

export function createRecommendationTitle(
  decision: ReviewDecision,
  subject: string,
  target: ReviewRecommendationTarget
): string {
  if (target.kind === 'plan') {
    if (decision === 'continue') return 'Continue with the current weekly plan';
    if (decision === 'adjust') return 'Adjust the weekly plan before next week';
    return 'Stop carrying this weekly plan into next week';
  }

  if (decision === 'continue') return `Continue with ${subject}`;
  if (decision === 'adjust') return `Adjust ${subject} before next week`;
  return `Stop planning ${subject}`;
}

export function createRecommendationSummary(
  decision: ReviewDecision,
  subject: string,
  evidence: string[]
): string {
  const lead = ensureSentence(evidence[0] ?? 'This was the clearest signal in the week');

  if (decision === 'continue') {
    return `${subject} had the strongest keep signal this week. ${lead}`;
  }

  if (decision === 'adjust') {
    return `${subject} needs a tighter next version before next week. ${lead}`;
  }

  return `${subject} was the clearest thing to remove from next week. ${lead}`;
}

export function createRecommendationImpact(input: {
  decision: ReviewDecision;
  hasNutritionSignal: boolean;
  hasPlanningSignal: boolean;
  hasGroceryFriction: boolean;
  hasRecoverySignal: boolean;
  hasMissSignal: boolean;
}): string {
  const { decision } = input;
  if (decision === 'continue') {
    if (input.hasNutritionSignal) {
      return 'Keep the meal pattern that already supported protein coverage.';
    }

    if (input.hasPlanningSignal) {
      return 'Keep the next week simpler and more repeatable.';
    }

    return 'Protect the part of the plan that already carried the least friction.';
  }

  if (decision === 'adjust') {
    if (input.hasGroceryFriction) {
      return 'Cut waste before the next grocery cycle.';
    }

    if (input.hasRecoverySignal) {
      return 'Reduce recovery friction before it spills into next week.';
    }

    return 'Reduce friction while keeping momentum.';
  }

  if (input.hasGroceryFriction) {
    return 'Prevent another week of avoidable grocery waste.';
  }

  if (input.hasMissSignal) {
    return 'Prevent another avoidable miss next week.';
  }

  return 'Remove the part of the plan the week did not support.';
}

export function createRecommendationAction(input: {
  target: ReviewRecommendationTarget;
  decision: ReviewDecision;
}): ReviewWeeklyRecommendation['actionLabel'] {
  if (input.target.kind === 'food') {
    return input.decision === 'stop' ? 'Review food' : 'Load food';
  }

  if (input.target.kind === 'recipe') {
    return input.decision === 'stop' ? 'Review recipe' : 'Load recipe';
  }

  return 'Open Plan';
}

export function containsAnyReviewSignal(lines: string[], patterns: string[]): boolean {
  const haystack = lines.join(' ').toLocaleLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

export function resolveSavedExperimentId(snapshot: ReviewSnapshot): ReviewExperimentId | null {
  if (snapshot.experimentId && reviewExperimentDefinitionById(snapshot.experimentId)) {
    return snapshot.experimentId as ReviewExperimentId;
  }

  return reviewExperimentIdFromLabel(snapshot.experiment);
}

export { clampNumber, HIGH_PROTEIN_GRAMS, MIN_SLEEP_HOURS };
export type { ReviewExperimentCandidate, ReviewSavedExperimentVerdict };
