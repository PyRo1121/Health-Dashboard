import { REVIEW_EXPERIMENT_DEFINITIONS, reviewExperimentLabel } from './experiment-registry';
import type { ReviewExperimentId } from './experiment-registry';
import {
  containsAnyReviewSignal,
  dedupeRecommendationLines,
  findAdherenceScore,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
  resolveSavedExperimentId,
  type RecommendationEngineInput,
  type ReviewExperimentCandidate,
  type ReviewSavedExperimentVerdict,
} from './recommendation-engine-shared';
import type { WeeklyReviewData } from './analytics';

type ExperimentOptionCandidate = ReviewExperimentCandidate & {
  label: (typeof REVIEW_EXPERIMENT_DEFINITIONS)[number]['label'];
  score: number;
};

type ReviewExperimentHandler = {
  buildCandidate: (
    input: RecommendationEngineInput,
    context: {
      meals: WeeklyReviewData['adherenceScores'][number] | null;
      reviewSignals: string[];
      hydrationSignals: string[];
    }
  ) => ExperimentOptionCandidate;
  buildVerdict: (input: RecommendationEngineInput) => ReviewSavedExperimentVerdict;
};

function buildMindfulnessExperimentCandidate(
  input: RecommendationEngineInput,
  reviewSignals: string[]
): ExperimentOptionCandidate {
  return {
    id: 'mindfulness-10min-morning',
    label: reviewExperimentLabel('mindfulness-10min-morning'),
    summary:
      'Low sleep, stress, or anxiety signals stacked up this week. Use a short morning reset to lower carry-over friction before the day starts.',
    confidence:
      input.averageSleep < MIN_SLEEP_HOURS &&
      containsAnyReviewSignal(reviewSignals, ['anxiety', 'stress', 'sleep'])
        ? 'high'
        : containsAnyReviewSignal(reviewSignals, ['anxiety', 'stress', 'sleep'])
          ? 'medium'
          : 'low',
    expectedImpact: 'Reduce early-day recovery drag and make the week easier to repeat.',
    provenance: dedupeRecommendationLines(
      [
        `Average sleep this week: ${input.averageSleep} hours.`,
        input.healthHighlights[0] ? `Health signal: ${input.healthHighlights[0]}` : null,
        input.contextSignals[0] ? `Context signal: ${input.contextSignals[0]}` : null,
      ],
      3
    ),
    score:
      20 +
      (input.averageSleep < MIN_SLEEP_HOURS ? 18 : 0) +
      (containsAnyReviewSignal(reviewSignals, [
        'anxiety',
        'stress',
        'sleep',
        'journal',
        'headache',
        'worry',
      ])
        ? 16
        : 0) +
      (input.contextSignals.length > 0 || input.patternHighlights.length > 0 ? 8 : 0),
  };
}

function buildHydrationExperimentCandidate(
  input: RecommendationEngineInput,
  hydrationSignals: string[]
): ExperimentOptionCandidate {
  return {
    id: 'hydration-tracking',
    label: reviewExperimentLabel('hydration-tracking'),
    summary:
      'The week has recovery or device-context noise that hydration tracking can clarify. Use it to separate low-energy noise from true workload or sleep problems.',
    confidence:
      input.deviceHighlights.length > 0 && input.grocerySignals.length > 0
        ? 'high'
        : containsAnyReviewSignal(hydrationSignals, ['sleep', 'headache', 'recovery'])
          ? 'medium'
          : 'low',
    expectedImpact: 'Improve recovery signal quality before the next weekly review.',
    provenance: dedupeRecommendationLines(
      [
        input.deviceHighlights[0] ? `Device signal: ${input.deviceHighlights[0]}` : null,
        input.grocerySignals[0] ? `Grocery signal: ${input.grocerySignals[0]}` : null,
        input.whatChangedHighlights[0] ? `What changed: ${input.whatChangedHighlights[0]}` : null,
      ],
      3
    ),
    score:
      20 +
      (input.deviceHighlights.length > 0 ? 12 : 0) +
      (containsAnyReviewSignal(hydrationSignals, [
        'sleep',
        'headache',
        'recovery',
        'grocery',
        'miss',
      ])
        ? 10
        : 0) +
      (input.grocerySignals.length > 0 ? 6 : 0),
  };
}

function buildProteinExperimentCandidate(
  input: RecommendationEngineInput,
  meals: WeeklyReviewData['adherenceScores'][number] | null
): ExperimentOptionCandidate {
  return {
    id: 'protein-breakfast',
    label: reviewExperimentLabel('protein-breakfast'),
    summary:
      'Protein coverage is still inconsistent enough that breakfast is the cleanest place to improve it without adding planning complexity elsewhere.',
    confidence:
      input.averageProtein < HIGH_PROTEIN_GRAMS && meals && meals.score < 80
        ? 'high'
        : input.averageProtein < HIGH_PROTEIN_GRAMS
          ? 'medium'
          : 'low',
    expectedImpact: 'Raise protein consistency early in the day and reduce downstream misses.',
    provenance: dedupeRecommendationLines(
      [
        `Average protein this week: ${input.averageProtein}g.`,
        meals ? `${meals.label} follow-through this week: ${meals.score}% (${meals.detail})` : null,
        input.nutritionHighlights[0] ? `Nutrition signal: ${input.nutritionHighlights[0]}` : null,
      ],
      3
    ),
    score:
      20 +
      (input.averageProtein < HIGH_PROTEIN_GRAMS ? 18 : 0) +
      (input.nutritionHighlights.length > 0 ? 8 : 0) +
      (meals && meals.score < 80 ? 10 : 0) +
      (input.nutritionStrategy.some((item) => item.kind !== 'skip') ? 4 : 0),
  };
}

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

const REVIEW_EXPERIMENT_HANDLERS: Record<ReviewExperimentId, ReviewExperimentHandler> = {
  'mindfulness-10min-morning': {
    buildCandidate: (input, context) =>
      buildMindfulnessExperimentCandidate(input, context.reviewSignals),
    buildVerdict: buildMindfulnessExperimentVerdict,
  },
  'hydration-tracking': {
    buildCandidate: (input, context) =>
      buildHydrationExperimentCandidate(input, context.hydrationSignals),
    buildVerdict: buildHydrationExperimentVerdict,
  },
  'protein-breakfast': {
    buildCandidate: (input, context) => buildProteinExperimentCandidate(input, context.meals),
    buildVerdict: buildProteinExperimentVerdict,
  },
};

export function buildReviewExperimentCandidates(
  input: RecommendationEngineInput
): ReviewExperimentCandidate[] {
  const meals = findAdherenceScore(input.adherenceScores, 'Meals');
  const reviewSignals = [
    ...input.healthHighlights,
    ...input.contextSignals,
    ...input.patternHighlights,
    ...input.whatChangedHighlights,
    ...input.snapshot.flags,
  ];
  const hydrationSignals = [...reviewSignals, ...input.deviceHighlights, ...input.grocerySignals];
  const candidates: ExperimentOptionCandidate[] = REVIEW_EXPERIMENT_DEFINITIONS.map((definition) =>
    REVIEW_EXPERIMENT_HANDLERS[definition.id].buildCandidate(input, {
      meals,
      reviewSignals,
      hydrationSignals,
    })
  );

  return candidates
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .map((candidate) => {
      const result = { ...candidate };
      delete (result as { score?: number }).score;
      return result;
    });
}

export function resolveSelectedExperimentId(
  candidates: ReviewExperimentCandidate[],
  snapshot: RecommendationEngineInput['snapshot']
): string {
  if (
    snapshot.experimentId &&
    candidates.some((candidate) => candidate.id === snapshot.experimentId)
  ) {
    return snapshot.experimentId;
  }

  if (snapshot.experiment) {
    const matched = candidates.find((candidate) => candidate.label === snapshot.experiment);
    if (matched) return matched.id;
  }

  return candidates[0]?.id ?? '';
}

export function buildSavedExperimentVerdict(
  input: RecommendationEngineInput
): ReviewSavedExperimentVerdict | null {
  const experimentId = resolveSavedExperimentId(input.snapshot);
  if (!experimentId) return null;
  return REVIEW_EXPERIMENT_HANDLERS[experimentId].buildVerdict(input);
}
