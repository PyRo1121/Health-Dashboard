import { REVIEW_EXPERIMENT_DEFINITIONS, reviewExperimentLabel } from './experiment-registry';
import type { ReviewExperimentId } from './experiment-registry';
import {
  containsAnyReviewSignal,
  dedupeRecommendationLines,
  findAdherenceScore,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
  type RecommendationEngineInput,
  type ReviewExperimentCandidate,
} from './recommendation-engine-shared';
import type { WeeklyReviewData } from './analytics';

type ExperimentOptionCandidate = ReviewExperimentCandidate & {
  label: (typeof REVIEW_EXPERIMENT_DEFINITIONS)[number]['label'];
  score: number;
};

type ReviewExperimentCandidateHandler = {
  buildCandidate: (
    input: RecommendationEngineInput,
    context: {
      meals: WeeklyReviewData['adherenceScores'][number] | null;
      reviewSignals: string[];
      hydrationSignals: string[];
    }
  ) => ExperimentOptionCandidate;
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

const REVIEW_EXPERIMENT_CANDIDATE_HANDLERS: Record<
  ReviewExperimentId,
  ReviewExperimentCandidateHandler
> = {
  'mindfulness-10min-morning': {
    buildCandidate: (input, context) =>
      buildMindfulnessExperimentCandidate(input, context.reviewSignals),
  },
  'hydration-tracking': {
    buildCandidate: (input, context) =>
      buildHydrationExperimentCandidate(input, context.hydrationSignals),
  },
  'protein-breakfast': {
    buildCandidate: (input, context) => buildProteinExperimentCandidate(input, context.meals),
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
    REVIEW_EXPERIMENT_CANDIDATE_HANDLERS[definition.id].buildCandidate(input, {
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
