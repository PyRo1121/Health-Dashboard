import { reviewExperimentLabel } from './experiment-registry';
import type { ReviewExperimentId } from './experiment-registry';
import {
  containsAnyReviewSignal,
  dedupeRecommendationLines,
  findAdherenceScore,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
  resolveSavedExperimentId,
  type RecommendationEngineInput,
  type ReviewSavedExperimentVerdict,
} from './recommendation-engine-shared';

type ReviewExperimentVerdictHandler = {
  buildVerdict: (input: RecommendationEngineInput) => ReviewSavedExperimentVerdict;
};

function buildProteinExperimentVerdict(
  input: RecommendationEngineInput
): ReviewSavedExperimentVerdict {
  const meals = findAdherenceScore(input.adherenceScores, 'Meals');
  const needsProteinSupport = input.averageProtein < HIGH_PROTEIN_GRAMS;
  const mealFollowThroughLow = Boolean(meals && meals.score < 80);
  const decision =
    needsProteinSupport || mealFollowThroughLow
      ? 'continue'
      : input.averageProtein < HIGH_PROTEIN_GRAMS + 15
        ? 'adjust'
        : 'stop';
  const provenance = dedupeRecommendationLines(
    [
      `Average protein this week: ${input.averageProtein}g.`,
      meals ? `${meals.label} follow-through this week: ${meals.score}% (${meals.detail})` : null,
      input.nutritionHighlights[0] ? `Nutrition signal: ${input.nutritionHighlights[0]}` : null,
    ],
    3
  );

  return {
    decision,
    label: reviewExperimentLabel('protein-breakfast'),
    summary:
      decision === 'continue'
        ? 'Protein coverage is still inconsistent enough that this experiment should stay in motion next week.'
        : decision === 'adjust'
          ? 'Breakfast protein is helping, but the next version should be narrower or easier to repeat.'
          : 'Protein coverage is strong enough that this no longer needs to be the lead experiment next week.',
    confidence:
      needsProteinSupport && mealFollowThroughLow ? 'high' : needsProteinSupport ? 'medium' : 'low',
    expectedImpact:
      decision === 'continue'
        ? 'Protect morning protein consistency before chasing a new experiment.'
        : decision === 'adjust'
          ? 'Keep the signal while reducing execution friction.'
          : 'Free the next weekly experiment slot for a more urgent issue.',
    provenance,
  };
}

function buildHydrationExperimentVerdict(
  input: RecommendationEngineInput
): ReviewSavedExperimentVerdict {
  const signals = [
    ...input.healthHighlights,
    ...input.contextSignals,
    ...input.patternHighlights,
    ...input.whatChangedHighlights,
    ...input.snapshot.flags,
    ...input.deviceHighlights,
    ...input.grocerySignals,
  ];
  const hydrationPressure =
    input.deviceHighlights.length > 0 ||
    containsAnyReviewSignal(signals, ['sleep', 'headache', 'recovery', 'energy']);
  const decision =
    input.deviceHighlights.length > 0 ? 'continue' : hydrationPressure ? 'adjust' : 'stop';
  const provenance = dedupeRecommendationLines(
    [
      input.deviceHighlights[0] ? `Device signal: ${input.deviceHighlights[0]}` : null,
      input.healthHighlights[0] ? `Health signal: ${input.healthHighlights[0]}` : null,
      input.whatChangedHighlights[0] ? `What changed: ${input.whatChangedHighlights[0]}` : null,
    ],
    3
  );

  return {
    decision,
    label: reviewExperimentLabel('hydration-tracking'),
    summary:
      decision === 'continue'
        ? 'Hydration tracking is still helping separate recovery noise from the rest of the week.'
        : decision === 'adjust'
          ? 'Hydration is still worth tracking, but it does not need to stay this broad next week.'
          : 'The week did not produce enough hydration-specific signal to justify keeping this experiment active.',
    confidence: input.deviceHighlights.length > 0 ? 'high' : hydrationPressure ? 'medium' : 'low',
    expectedImpact:
      decision === 'continue'
        ? 'Keep recovery interpretation cleaner through the next weekly review.'
        : decision === 'adjust'
          ? 'Preserve useful signal without spending a full experiment slot on it.'
          : 'Make room for a more actionable experiment next week.',
    provenance,
  };
}

function buildMindfulnessExperimentVerdict(
  input: RecommendationEngineInput
): ReviewSavedExperimentVerdict {
  const signals = [
    ...input.healthHighlights,
    ...input.contextSignals,
    ...input.patternHighlights,
    ...input.whatChangedHighlights,
    ...input.snapshot.flags,
    ...input.deviceHighlights,
    ...input.grocerySignals,
  ];
  const mindfulnessPressure =
    input.averageSleep < MIN_SLEEP_HOURS ||
    containsAnyReviewSignal(signals, ['anxiety', 'stress', 'worry', 'headache']);
  const strongPressure =
    input.averageSleep < MIN_SLEEP_HOURS && containsAnyReviewSignal(signals, ['anxiety', 'stress']);
  const decision = strongPressure ? 'continue' : mindfulnessPressure ? 'adjust' : 'stop';
  const provenance = dedupeRecommendationLines(
    [
      `Average sleep this week: ${input.averageSleep} hours.`,
      input.healthHighlights[0] ? `Health signal: ${input.healthHighlights[0]}` : null,
      input.contextSignals[0] ? `Context signal: ${input.contextSignals[0]}` : null,
    ],
    3
  );

  return {
    decision,
    label: reviewExperimentLabel('mindfulness-10min-morning'),
    summary:
      decision === 'continue'
        ? 'The week still shows enough recovery and stress pressure that this should remain the active experiment.'
        : decision === 'adjust'
          ? 'A mindfulness experiment still fits, but the next version should be more targeted or easier to keep.'
          : 'The week no longer shows enough stress or sleep pressure to keep this as the lead experiment.',
    confidence: strongPressure ? 'high' : mindfulnessPressure ? 'medium' : 'low',
    expectedImpact:
      decision === 'continue'
        ? 'Reduce carry-over stress before it turns into another unstable week.'
        : decision === 'adjust'
          ? 'Keep the habit while reducing setup or compliance friction.'
          : 'Free the next experiment slot for a more urgent signal.',
    provenance,
  };
}

const REVIEW_EXPERIMENT_VERDICT_HANDLERS: Record<
  ReviewExperimentId,
  ReviewExperimentVerdictHandler
> = {
  'mindfulness-10min-morning': {
    buildVerdict: buildMindfulnessExperimentVerdict,
  },
  'hydration-tracking': {
    buildVerdict: buildHydrationExperimentVerdict,
  },
  'protein-breakfast': {
    buildVerdict: buildProteinExperimentVerdict,
  },
};

export function buildSavedExperimentVerdict(
  input: RecommendationEngineInput
): ReviewSavedExperimentVerdict | null {
  const experimentId = resolveSavedExperimentId(input.snapshot);
  if (!experimentId) return null;
  return REVIEW_EXPERIMENT_VERDICT_HANDLERS[experimentId].buildVerdict(input);
}
