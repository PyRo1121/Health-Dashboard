import type {
  HealthDbAdherenceMatchesStore,
  HealthDbAssessmentResultsStore,
  HealthDbDailyRecordsStore,
  HealthDbDerivedGroceryItemsStore,
  HealthDbFoodCatalogItemsStore,
  HealthDbFoodEntriesStore,
  HealthDbHealthEventsStore,
  HealthDbJournalEntriesStore,
  HealthDbManualGroceryItemsStore,
  HealthDbPlanSlotsStore,
  HealthDbRecipeCatalogItemsStore,
  HealthDbReviewSnapshotsStore,
  HealthDbSobrietyEventsStore,
  HealthDbWeeklyPlansStore,
} from '$lib/core/db/types';
import { nowIso } from '$lib/core/domain/time';
import type {
  AdherenceMatch,
  AssessmentResult,
  DailyRecord,
  DerivedGroceryItem,
  FoodCatalogItem,
  FoodEntry,
  GroceryItem,
  HealthEvent,
  JournalEntry,
  ManualGroceryItem,
  PlanSlot,
  RecipeCatalogItem,
  ReviewSnapshot,
  SobrietyEvent,
  WeeklyPlan,
} from '$lib/core/domain/types';
import { startOfWeek } from '$lib/core/shared/dates';
import { updateRecordMeta } from '$lib/core/shared/records';
import { computeWeekAdherenceMatches } from '$lib/features/adherence/matching';
import { deriveWeeklyGroceriesFromData } from '$lib/features/groceries/derivation';
import {
  clampNumber,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
  type ReviewExperimentCandidate,
  type ReviewSavedExperimentVerdict,
  takeUniqueStrings,
} from './analytics-shared';
import {
  REVIEW_EXPERIMENT_DEFINITIONS,
  reviewExperimentDefinitionById,
  reviewExperimentIdFromLabel,
  reviewExperimentLabel,
  type ReviewExperimentId,
} from './experiment-registry';
import {
  buildAdherenceScores,
  buildAdherenceSignals,
  buildAssessmentSummary,
  buildContextSignals,
  buildDeviceHighlights,
  buildGrocerySignals,
  buildHealthHighlights,
  buildHeadline,
  buildJournalHighlights,
  buildPatternHighlights,
  buildNutritionHighlights,
  buildNutritionStrategy,
  buildPlanningHighlights,
  computeCorrelations,
  computeSobrietyStreak,
  computeTrendComparisonsFromData,
  filterByDays,
  generateReviewFlags,
  REVIEW_EXPERIMENT_OPTIONS,
  weekRangeFromAnchorDay,
  type WeeklyReviewData,
  type ReviewDecisionCard,
  type ReviewDecision,
  type ReviewRecommendationTarget,
  type ReviewWeeklyRecommendation,
} from './analytics';

export type { ReviewCorrelation, WeeklyReviewData } from './analytics';
export { computeCorrelations, generateReviewFlags } from './analytics';

function buildReviewRecommendationTarget(input: {
  kind: 'food' | 'recipe' | 'plan';
  id?: string;
}): ReviewRecommendationTarget {
  return input;
}

function toDecision(kind: 'repeat' | 'rotate' | 'skip'): ReviewDecision {
  if (kind === 'repeat') return 'continue';
  if (kind === 'rotate') return 'adjust';
  return 'stop';
}

function toTargetFromStrategy(
  item: WeeklyReviewData['nutritionStrategy'][number]
): ReviewRecommendationTarget {
  return buildReviewRecommendationTarget({
    kind: item.recommendationKind,
    id: item.recommendationId,
  });
}

function buildWhatChangedEnoughToMatter(input: {
  correlations: WeeklyReviewData['snapshot']['correlations'];
  assessmentSummary: string[];
  healthHighlights: string[];
  contextSignals: string[];
  planningHighlights: string[];
  grocerySignals: string[];
  deviceHighlights: string[];
  patternHighlights: string[];
}): string[] {
  const candidates = [
    ...input.assessmentSummary.map((line, index) => ({ line, score: 54 - index })),
    ...input.healthHighlights.map((line, index) => ({ line, score: 50 - index })),
    ...input.contextSignals.map((line, index) => ({ line, score: 44 - index })),
    ...input.patternHighlights.map((line, index) => ({ line, score: 38 - index })),
    ...input.planningHighlights.map((line, index) => ({ line, score: 35 - index })),
    ...input.grocerySignals.map((line, index) => ({ line, score: 32 - index })),
    ...input.deviceHighlights.map((line, index) => ({ line, score: 26 - index })),
    ...input.correlations.map((item, index) => ({ line: item.label, score: 20 - index })),
  ].filter((candidate) => candidate.line);

  const ranked: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates.sort(
    (left, right) => right.score - left.score || left.line.localeCompare(right.line)
  )) {
    const normalized = candidate.line.trim();
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    ranked.push(normalized);
    if (ranked.length >= 4) break;
  }

  return ranked;
}

type RecommendationEngineInput = {
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

function resolveSavedExperimentId(snapshot: ReviewSnapshot): ReviewExperimentId | null {
  if (snapshot.experimentId && reviewExperimentDefinitionById(snapshot.experimentId)) {
    return snapshot.experimentId as ReviewExperimentId;
  }

  return reviewExperimentIdFromLabel(snapshot.experiment);
}

type ReviewRecommendationCandidate = ReviewWeeklyRecommendation & {
  score: number;
  card: ReviewDecisionCard;
};

function dedupeRecommendationLines(
  lines: Array<string | null | undefined>,
  limit: number
): string[] {
  return takeUniqueStrings(lines, limit);
}

function ensureSentence(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return '';
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function findAdherenceScore(
  scores: WeeklyReviewData['adherenceScores'],
  label: 'Overall' | 'Meals' | 'Workouts'
): WeeklyReviewData['adherenceScores'][number] | null {
  return scores.find((score) => score.label === label) ?? null;
}

function deriveRecommendationConfidence(input: {
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

function createRecommendationTitle(
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

function createRecommendationSummary(
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

function createRecommendationImpact(input: {
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

function createRecommendationAction(input: {
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

function containsAnyReviewSignal(lines: string[], patterns: string[]): boolean {
  const haystack = lines.join(' ').toLocaleLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

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
  const decision: ReviewDecision =
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
  const decision: ReviewDecision =
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
  const decision: ReviewDecision = strongPressure
    ? 'continue'
    : mindfulnessPressure
      ? 'adjust'
      : 'stop';
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

function buildReviewExperimentCandidates(
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
    .map(({ score: _score, ...candidate }) => candidate);
}

function resolveSelectedExperimentId(
  candidates: ReviewExperimentCandidate[],
  snapshot: ReviewSnapshot
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

function buildSavedExperimentVerdict(
  input: RecommendationEngineInput
): ReviewSavedExperimentVerdict | null {
  const experimentId = resolveSavedExperimentId(input.snapshot);
  if (!experimentId) return null;
  return REVIEW_EXPERIMENT_HANDLERS[experimentId].buildVerdict(input);
}

function createStrategyRecommendationCandidate(input: {
  item: WeeklyReviewData['nutritionStrategy'][number];
  signals: RecommendationEngineInput;
}): ReviewRecommendationCandidate {
  const decision = toDecision(input.item.kind);
  const { signals } = input;
  const overall = findAdherenceScore(signals.adherenceScores, 'Overall');
  const meals = findAdherenceScore(signals.adherenceScores, 'Meals');
  const target = toTargetFromStrategy(input.item);
  const evidence = dedupeRecommendationLines(
    [
      input.item.detail,
      meals ? `${meals.label} follow-through this week: ${meals.score}% (${meals.detail})` : null,
      overall
        ? `${overall.label} follow-through this week: ${overall.score}% (${overall.detail})`
        : null,
      decision === 'continue' && signals.nutritionHighlights[0]
        ? `Logged meal support: ${signals.nutritionHighlights[0]}`
        : null,
      decision !== 'continue' && signals.grocerySignals.length > 0
        ? 'Grocery friction surfaced around this choice.'
        : null,
      decision !== 'continue' &&
      (signals.healthHighlights.length > 0 ||
        signals.contextSignals.length > 0 ||
        signals.patternHighlights.length > 0)
        ? 'Recovery or context pressure showed up in the same week.'
        : null,
      decision !== 'continue' && signals.snapshot.flags[0]
        ? `Weekly drift flag: ${signals.snapshot.flags[0]}`
        : null,
    ],
    3
  );

  let score = decision === 'continue' ? 56 : decision === 'adjust' ? 54 : 58;

  if (meals) {
    if (decision === 'continue') {
      score += meals.score >= 80 ? 22 : meals.score >= 60 ? 10 : -18;
    } else if (decision === 'adjust') {
      score += meals.score >= 40 && meals.score < 80 ? 18 : meals.score >= 80 ? -8 : 12;
    } else {
      score += meals.score < 50 ? 24 : meals.score < 80 ? 10 : -16;
    }
  }

  if (overall) {
    if (decision === 'continue' && overall.score >= 70) score += 10;
    if (decision !== 'continue' && overall.score < 60) score += 8;
    score -= Math.min(6, overall.inferredCount * 2);
  }

  if (signals.grocerySignals.length > 0) {
    score += decision === 'stop' ? 14 : decision === 'adjust' ? 8 : -8;
  }

  if (
    signals.healthHighlights.length > 0 ||
    signals.contextSignals.length > 0 ||
    signals.patternHighlights.length > 0
  ) {
    score += decision === 'continue' ? -4 : 6;
  }

  if (signals.snapshot.flags.length > 0) {
    score += decision === 'stop' ? 8 : decision === 'adjust' ? 4 : -4;
  }

  score += Math.min(12, evidence.length * 4);
  score = clampNumber(score, 0, 100);

  const subject = input.item.title;
  const hasRecoverySignal =
    signals.healthHighlights.length > 0 ||
    signals.contextSignals.length > 0 ||
    signals.patternHighlights.length > 0;
  const hasPlanningSignal = Boolean(
    signals.planningHighlights.find((line) => /completed|checked|on hand/i.test(line))
  );
  const hasMissSignal = Boolean(
    (meals && meals.score < 100) ||
    (overall && overall.score < 100) ||
    signals.snapshot.flags.length
  );

  return {
    decision,
    title: createRecommendationTitle(decision, subject, target),
    summary: createRecommendationSummary(decision, subject, evidence),
    confidence: deriveRecommendationConfidence({
      score,
      evidenceCount: evidence.length,
      inferredCount: (overall?.inferredCount ?? 0) + (meals?.inferredCount ?? 0),
    }),
    expectedImpact: createRecommendationImpact({
      decision,
      hasNutritionSignal: signals.nutritionHighlights.length > 0,
      hasPlanningSignal,
      hasGroceryFriction: signals.grocerySignals.length > 0,
      hasRecoverySignal,
      hasMissSignal,
    }),
    provenance: evidence,
    actionLabel: createRecommendationAction({
      target,
      decision,
    }),
    target,
    score,
    card: {
      decision,
      title: input.item.title,
      detail: evidence[0] ?? input.item.detail,
      confidence: deriveRecommendationConfidence({
        score,
        evidenceCount: evidence.length,
        inferredCount: (overall?.inferredCount ?? 0) + (meals?.inferredCount ?? 0),
      }),
      expectedImpact: createRecommendationImpact({
        decision,
        hasNutritionSignal: signals.nutritionHighlights.length > 0,
        hasPlanningSignal,
        hasGroceryFriction: signals.grocerySignals.length > 0,
        hasRecoverySignal,
        hasMissSignal,
      }),
      provenance: evidence,
      target,
    },
  };
}

function createGroceryRecommendationCandidate(input: {
  signals: RecommendationEngineInput;
}): ReviewRecommendationCandidate | null {
  if (!input.signals.grocerySignals.length) {
    return null;
  }

  const overall = findAdherenceScore(input.signals.adherenceScores, 'Overall');
  const meals = findAdherenceScore(input.signals.adherenceScores, 'Meals');
  const target = buildReviewRecommendationTarget({ kind: 'plan' });
  const evidence = dedupeRecommendationLines(
    [
      'Grocery friction showed up in the current weekly plan.',
      meals ? `${meals.label} follow-through this week: ${meals.score}% (${meals.detail})` : null,
      overall
        ? `${overall.label} follow-through this week: ${overall.score}% (${overall.detail})`
        : null,
      input.signals.grocerySignals.length > 1
        ? 'More than one grocery issue surfaced around missed planned meals.'
        : null,
    ],
    3
  );
  const score =
    52 +
    Math.min(18, input.signals.grocerySignals.length * 7) +
    (meals && meals.score < 50 ? 10 : 0) +
    (overall && overall.score < 60 ? 6 : 0);

  return {
    decision: 'adjust',
    title: createRecommendationTitle('adjust', 'the current weekly plan', target),
    summary: createRecommendationSummary('adjust', 'the current weekly plan', evidence),
    confidence: deriveRecommendationConfidence({
      score,
      evidenceCount: evidence.length,
      inferredCount: (overall?.inferredCount ?? 0) + (meals?.inferredCount ?? 0),
    }),
    expectedImpact: createRecommendationImpact({
      decision: 'adjust',
      hasNutritionSignal: false,
      hasPlanningSignal: input.signals.planningHighlights.length > 0,
      hasGroceryFriction: true,
      hasRecoverySignal: false,
      hasMissSignal: Boolean((meals && meals.score < 100) || (overall && overall.score < 100)),
    }),
    provenance: evidence,
    actionLabel: 'Open Plan',
    target,
    score,
    card: {
      decision: 'adjust',
      title: 'Current weekly plan',
      detail: evidence[0],
      confidence: deriveRecommendationConfidence({
        score,
        evidenceCount: evidence.length,
        inferredCount: (overall?.inferredCount ?? 0) + (meals?.inferredCount ?? 0),
      }),
      expectedImpact: createRecommendationImpact({
        decision: 'adjust',
        hasNutritionSignal: false,
        hasPlanningSignal: input.signals.planningHighlights.length > 0,
        hasGroceryFriction: true,
        hasRecoverySignal: false,
        hasMissSignal: Boolean((meals && meals.score < 100) || (overall && overall.score < 100)),
      }),
      provenance: evidence,
      target,
    },
  };
}

function createSignalFallbackRecommendationCandidate(input: {
  signals: RecommendationEngineInput;
}): ReviewRecommendationCandidate | null {
  const evidence = dedupeRecommendationLines(
    [
      ...input.signals.whatChangedHighlights.map((line) => `Shift this week: ${line}`),
      ...input.signals.contextSignals.map((line) => `Context signal: ${line}`),
      ...input.signals.healthHighlights.map((line) => `Health signal: ${line}`),
      ...input.signals.patternHighlights.map((line) => `Pattern signal: ${line}`),
      ...input.signals.deviceHighlights.map((line) => `Device signal: ${line}`),
      ...input.signals.assessmentSummary.map((line) => `Assessment signal: ${line}`),
      input.signals.snapshot.flags[0]
        ? `Weekly drift flag: ${input.signals.snapshot.flags[0]}`
        : null,
    ],
    3
  );

  if (!evidence.length) {
    return null;
  }

  const overall = findAdherenceScore(input.signals.adherenceScores, 'Overall');
  const target = buildReviewRecommendationTarget({ kind: 'plan' });
  const score = 48 + Math.min(15, evidence.length * 5) + (overall && overall.score < 60 ? 6 : 0);

  return {
    decision: 'adjust',
    title: createRecommendationTitle('adjust', 'the current weekly plan', target),
    summary: createRecommendationSummary('adjust', 'the current weekly plan', evidence),
    confidence: deriveRecommendationConfidence({
      score,
      evidenceCount: evidence.length,
      inferredCount: overall?.inferredCount ?? 0,
    }),
    expectedImpact: createRecommendationImpact({
      decision: 'adjust',
      hasNutritionSignal: false,
      hasPlanningSignal: input.signals.planningHighlights.length > 0,
      hasGroceryFriction: false,
      hasRecoverySignal:
        input.signals.healthHighlights.length > 0 ||
        input.signals.contextSignals.length > 0 ||
        input.signals.patternHighlights.length > 0,
      hasMissSignal: Boolean(overall && overall.score < 100),
    }),
    provenance: evidence,
    actionLabel: 'Open Plan',
    target,
    score,
    card: {
      decision: 'adjust',
      title: 'Current weekly plan',
      detail: evidence[0],
      confidence: deriveRecommendationConfidence({
        score,
        evidenceCount: evidence.length,
        inferredCount: overall?.inferredCount ?? 0,
      }),
      expectedImpact: createRecommendationImpact({
        decision: 'adjust',
        hasNutritionSignal: false,
        hasPlanningSignal: input.signals.planningHighlights.length > 0,
        hasGroceryFriction: false,
        hasRecoverySignal:
          input.signals.healthHighlights.length > 0 ||
          input.signals.contextSignals.length > 0 ||
          input.signals.patternHighlights.length > 0,
        hasMissSignal: Boolean(overall && overall.score < 100),
      }),
      provenance: evidence,
      target,
    },
  };
}

function buildWeeklyRecommendationCandidates(
  input: RecommendationEngineInput
): ReviewRecommendationCandidate[] {
  const candidates: ReviewRecommendationCandidate[] = input.nutritionStrategy.map((item) =>
    createStrategyRecommendationCandidate({
      item,
      signals: input,
    })
  );

  const groceryCandidate = createGroceryRecommendationCandidate({
    signals: input,
  });
  if (groceryCandidate) {
    candidates.push(groceryCandidate);
  }

  const signalFallback = createSignalFallbackRecommendationCandidate({
    signals: input,
  });
  if (signalFallback) {
    candidates.push(signalFallback);
  }

  return candidates.sort(
    (left, right) =>
      right.score - left.score ||
      left.decision.localeCompare(right.decision) ||
      left.title.localeCompare(right.title)
  );
}

function buildWeeklyDecisionCards(input: RecommendationEngineInput): ReviewDecisionCard[] {
  const seen = new Set<string>();
  const cards: ReviewDecisionCard[] = [];

  for (const candidate of buildWeeklyRecommendationCandidates(input)) {
    const key = [
      candidate.card.decision,
      candidate.card.title,
      candidate.card.target.kind,
      candidate.card.target.id ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cards.push(candidate.card);

    if (cards.length >= 3) {
      break;
    }
  }

  return cards;
}

function buildWeeklyRecommendation(
  input: RecommendationEngineInput
): ReviewWeeklyRecommendation | null {
  return buildWeeklyRecommendationCandidates(input)[0] ?? null;
}

export interface ReviewStorage
  extends
    HealthDbDailyRecordsStore,
    HealthDbFoodEntriesStore,
    HealthDbSobrietyEventsStore,
    HealthDbAssessmentResultsStore,
    HealthDbHealthEventsStore,
    HealthDbJournalEntriesStore,
    HealthDbFoodCatalogItemsStore,
    HealthDbRecipeCatalogItemsStore,
    HealthDbWeeklyPlansStore,
    HealthDbPlanSlotsStore,
    HealthDbDerivedGroceryItemsStore,
    HealthDbManualGroceryItemsStore,
    HealthDbReviewSnapshotsStore,
    HealthDbAdherenceMatchesStore {}

export interface ReviewSourceData {
  dailyRecords: DailyRecord[];
  foodEntries: FoodEntry[];
  sobrietyEvents: SobrietyEvent[];
  assessments: AssessmentResult[];
  healthEvents: HealthEvent[];
  journalEntries: JournalEntry[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  weeklyPlans: WeeklyPlan[];
  planSlots: PlanSlot[];
}

export interface ReviewWeekData {
  anchorDay: string;
  weekStart: string;
  weekRecords: DailyRecord[];
  weekFood: FoodEntry[];
  weekSobriety: SobrietyEvent[];
  weekAssessments: AssessmentResult[];
  weekHealthEvents: HealthEvent[];
  weekJournalEntries: JournalEntry[];
  foodCatalogItems: FoodCatalogItem[];
  recipeCatalogItems: RecipeCatalogItem[];
  weeklyPlan: WeeklyPlan | null;
  weekPlanSlots: PlanSlot[];
}

function latestDay(days: Array<string | null | undefined>): string | null {
  return (
    days
      .filter((day): day is string => Boolean(day))
      .sort()
      .at(-1) ?? null
  );
}

async function loadReviewSourceData(store: ReviewStorage): Promise<ReviewSourceData> {
  const [
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  ] = await Promise.all([
    store.dailyRecords.toArray(),
    store.foodEntries.toArray(),
    store.sobrietyEvents.toArray(),
    store.assessmentResults.toArray(),
    store.healthEvents.toArray(),
    store.journalEntries.toArray(),
    store.foodCatalogItems.toArray(),
    store.recipeCatalogItems.toArray(),
    store.weeklyPlans.toArray(),
    store.planSlots.toArray(),
  ]);

  return {
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  };
}

export function resolveReviewAnchorDayFromSourceData(
  sourceData: ReviewSourceData,
  requestedAnchorDay: string
): string {
  const { weekStart, days } = weekRangeFromAnchorDay(requestedAnchorDay);
  const daySet = new Set(days);
  const {
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    weeklyPlans,
    planSlots,
  } = sourceData;

  const weeklyPlanIds = new Set(
    weeklyPlans.filter((plan) => plan.weekStart === weekStart).map((plan) => plan.id)
  );
  const hasActivity =
    dailyRecords.some((record) => daySet.has(record.date)) ||
    foodEntries.some((entry) => daySet.has(entry.localDay)) ||
    sobrietyEvents.some((event) => daySet.has(event.localDay)) ||
    assessments.some((assessment) => daySet.has(assessment.localDay)) ||
    healthEvents.some((event) => daySet.has(event.localDay)) ||
    journalEntries.some((entry) => daySet.has(entry.localDay)) ||
    planSlots.some((slot) => weeklyPlanIds.has(slot.weeklyPlanId));

  const latestAnchorDay = latestDay([
    ...dailyRecords.map((record) => record.date),
    ...foodEntries.map((entry) => entry.localDay),
    ...sobrietyEvents.map((event) => event.localDay),
    ...assessments.map((assessment) => assessment.localDay),
    ...healthEvents.map((event) => event.localDay),
    ...journalEntries.map((entry) => entry.localDay),
    ...weeklyPlans.map((plan) => plan.weekStart),
  ]);

  if (hasActivity || !latestAnchorDay) {
    return requestedAnchorDay;
  }

  return latestAnchorDay;
}

export function selectReviewWeekData(
  sourceData: ReviewSourceData,
  anchorDay: string
): ReviewWeekData {
  const { weekStart, days } = weekRangeFromAnchorDay(anchorDay);
  const {
    dailyRecords,
    foodEntries,
    sobrietyEvents,
    assessments,
    healthEvents,
    journalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlans,
    planSlots,
  } = sourceData;
  const weekRecords = filterByDays(dailyRecords, (record) => record.date, days);
  const weekFood = filterByDays(foodEntries, (entry) => entry.localDay, days);
  const weekSobriety = filterByDays(sobrietyEvents, (event) => event.localDay, days);
  const weekAssessments = filterByDays(assessments, (assessment) => assessment.localDay, days);
  const weekHealthEvents = filterByDays(healthEvents, (event) => event.localDay, days);
  const weekJournalEntries = filterByDays(journalEntries, (entry) => entry.localDay, days);
  const weeklyPlan = weeklyPlans.find((plan) => plan.weekStart === weekStart) ?? null;
  const weekPlanSlots = weeklyPlan
    ? planSlots.filter((slot) => slot.weeklyPlanId === weeklyPlan.id)
    : [];

  return {
    anchorDay,
    weekStart,
    weekRecords,
    weekFood,
    weekSobriety,
    weekAssessments,
    weekHealthEvents,
    weekJournalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlan,
    weekPlanSlots,
  };
}

export function buildWeeklySnapshotFromWeekData(input: {
  weekData: ReviewWeekData;
  existingSnapshot?: ReviewSnapshot;
  weekGroceries: GroceryItem[];
  adherenceMatches: AdherenceMatch[];
}): WeeklyReviewData {
  const { weekData, existingSnapshot, weekGroceries, adherenceMatches } = input;
  const {
    anchorDay,
    weekStart,
    weekRecords,
    weekFood,
    weekSobriety,
    weekAssessments,
    weekHealthEvents,
    weekJournalEntries,
    foodCatalogItems,
    recipeCatalogItems,
    weeklyPlan,
    weekPlanSlots,
  } = weekData;
  const journalDays = new Set(weekJournalEntries.map((entry) => entry.localDay));
  const trends = computeTrendComparisonsFromData(weekStart, weekRecords, weekFood);
  const correlations = computeCorrelations(weekRecords, weekFood);
  const flags = generateReviewFlags(weekRecords, weekSobriety, weekAssessments);
  const timestamp = nowIso();

  const snapshot: ReviewSnapshot = {
    ...updateRecordMeta(existingSnapshot, `review:${weekStart}`, timestamp),
    weekStart,
    headline: buildHeadline(weekRecords, flags),
    daysTracked: weekRecords.length,
    flags,
    correlations,
    experimentId:
      existingSnapshot?.experimentId ??
      reviewExperimentIdFromLabel(existingSnapshot?.experiment) ??
      undefined,
    experiment: existingSnapshot?.experiment,
  };

  const nutritionStrategy = buildNutritionStrategy(
    weekRecords,
    weekFood,
    weekHealthEvents,
    foodCatalogItems,
    recipeCatalogItems,
    weekPlanSlots,
    weekGroceries
  );
  const adherenceScores = buildAdherenceScores(adherenceMatches);
  const adherenceSignals = buildAdherenceSignals(adherenceMatches);
  const nutritionHighlights = buildNutritionHighlights(weekRecords, weekFood);
  const planningHighlights = buildPlanningHighlights(weeklyPlan, weekPlanSlots, weekGroceries);
  const deviceHighlights = buildDeviceHighlights(weekHealthEvents);
  const assessmentSummary = buildAssessmentSummary(weekAssessments);
  const healthHighlights = buildHealthHighlights(weekRecords, weekHealthEvents);
  const contextSignals = buildContextSignals(weekRecords, weekHealthEvents, weekJournalEntries);
  const patternHighlights = buildPatternHighlights(weekJournalEntries, weekHealthEvents);
  const grocerySignals = buildGrocerySignals(weekPlanSlots, weekGroceries, anchorDay);
  const whatChangedHighlights = buildWhatChangedEnoughToMatter({
    correlations,
    assessmentSummary,
    healthHighlights,
    contextSignals,
    planningHighlights,
    grocerySignals,
    deviceHighlights,
    patternHighlights,
  });
  const recommendationInput: RecommendationEngineInput = {
    snapshot,
    averageSleep: trends.averageSleep,
    averageProtein: trends.averageProtein,
    nutritionStrategy,
    nutritionHighlights,
    planningHighlights,
    adherenceScores,
    adherenceSignals,
    grocerySignals,
    deviceHighlights,
    assessmentSummary,
    whatChangedHighlights,
    contextSignals,
    healthHighlights,
    patternHighlights,
  };
  const weeklyDecisionCards = buildWeeklyDecisionCards(recommendationInput);
  const weeklyRecommendation = buildWeeklyRecommendation(recommendationInput);
  const experimentCandidates = buildReviewExperimentCandidates(recommendationInput);
  const savedExperimentVerdict = buildSavedExperimentVerdict(recommendationInput);
  const experimentOptions = experimentCandidates.map((candidate) => candidate.label);
  const selectedExperimentId = resolveSelectedExperimentId(experimentCandidates, snapshot);

  return {
    anchorDay,
    snapshot,
    averageMood: trends.averageMood,
    averageSleep: trends.averageSleep,
    averageProtein: trends.averageProtein,
    sobrietyStreak: computeSobrietyStreak(weekRecords),
    nutritionHighlights,
    nutritionStrategy,
    planningHighlights,
    adherenceScores,
    adherenceSignals,
    adherenceMatches,
    grocerySignals,
    deviceHighlights,
    assessmentSummary,
    healthHighlights,
    contextSignals,
    contextCaptureLinkedEventIds: weekHealthEvents
      .filter((event) => journalDays.has(event.localDay))
      .map((event) => event.id)
      .slice(0, 5),
    journalHighlights: buildJournalHighlights(weekJournalEntries),
    journalReflectionLinkedEventIds: weekJournalEntries
      .flatMap((entry) => entry.linkedEventIds)
      .slice(0, 5),
    patternHighlights,
    whatChangedHighlights,
    weeklyRecommendation,
    weeklyDecisionCards,
    experimentCandidates,
    savedExperimentVerdict,
    selectedExperimentId,
    experimentOptions,
  };
}

async function listAdherenceMatchesForWeek(
  store: ReviewStorage,
  weekStart: string
): Promise<AdherenceMatch[]> {
  return await store.adherenceMatches.where('weekStart').equals(weekStart).toArray();
}

async function listDerivedGroceriesForPlan(
  store: ReviewStorage,
  weeklyPlanId: string
): Promise<DerivedGroceryItem[]> {
  return await store.derivedGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

async function listManualGroceriesForPlan(
  store: ReviewStorage,
  weeklyPlanId: string
): Promise<ManualGroceryItem[]> {
  return await store.manualGroceryItems.where('weeklyPlanId').equals(weeklyPlanId).toArray();
}

async function persistDerivedGroceries(
  store: ReviewStorage,
  nextItems: DerivedGroceryItem[],
  existingItems: DerivedGroceryItem[]
): Promise<void> {
  for (const item of nextItems) {
    await store.derivedGroceryItems.put(item);
  }

  for (const staleItem of existingItems) {
    if (!nextItems.find((item) => item.id === staleItem.id)) {
      await store.derivedGroceryItems.delete(staleItem.id);
    }
  }
}

async function persistAdherenceMatches(
  store: ReviewStorage,
  nextMatches: AdherenceMatch[],
  existingMatches: AdherenceMatch[]
): Promise<void> {
  for (const match of nextMatches) {
    await store.adherenceMatches.put(match);
  }

  for (const staleMatch of existingMatches) {
    if (!nextMatches.find((match) => match.id === staleMatch.id)) {
      await store.adherenceMatches.delete(staleMatch.id);
    }
  }
}

export async function resolveReviewAnchorDay(
  store: ReviewStorage,
  requestedAnchorDay: string
): Promise<string> {
  return resolveReviewAnchorDayFromSourceData(
    await loadReviewSourceData(store),
    requestedAnchorDay
  );
}

export async function computeTrendComparisons(
  store: ReviewStorage,
  anchorDay: string
): Promise<{
  weekStart: string;
  daysTracked: number;
  averageMood: number;
  averageSleep: number;
  averageProtein: number;
}> {
  const weekData = selectReviewWeekData(await loadReviewSourceData(store), anchorDay);
  return computeTrendComparisonsFromData(
    weekData.weekStart,
    weekData.weekRecords,
    weekData.weekFood
  );
}

export async function buildWeeklySnapshot(
  store: ReviewStorage,
  anchorDay: string
): Promise<WeeklyReviewData> {
  const weekData = selectReviewWeekData(await loadReviewSourceData(store), anchorDay);
  const [existingSnapshot, existingAdherenceMatches, existingDerivedItems, manualItems] =
    await Promise.all([
      store.reviewSnapshots.get(`review:${weekData.weekStart}`),
      listAdherenceMatchesForWeek(store, weekData.weekStart),
      weekData.weeklyPlan
        ? listDerivedGroceriesForPlan(store, weekData.weeklyPlan.id)
        : Promise.resolve([]),
      weekData.weeklyPlan
        ? listManualGroceriesForPlan(store, weekData.weeklyPlan.id)
        : Promise.resolve([]),
    ]);

  const groceryResult = weekData.weeklyPlan
    ? deriveWeeklyGroceriesFromData({
        weeklyPlanId: weekData.weeklyPlan.id,
        slots: weekData.weekPlanSlots,
        recipes: weekData.recipeCatalogItems,
        existingDerivedItems,
        manualItems,
      })
    : { derivedItems: [], items: [], warnings: [] };
  const adherenceComputation = computeWeekAdherenceMatches({
    existingMatches: existingAdherenceMatches,
    weekStart: weekData.weekStart,
    planSlots: weekData.weekPlanSlots,
    foodEntries: weekData.weekFood,
    anchorDay,
  });

  if (!adherenceComputation.reusedExisting) {
    await persistAdherenceMatches(store, adherenceComputation.matches, existingAdherenceMatches);
  }

  if (weekData.weeklyPlan) {
    await persistDerivedGroceries(store, groceryResult.derivedItems, existingDerivedItems);
  }

  return buildWeeklySnapshotFromWeekData({
    weekData,
    existingSnapshot: existingSnapshot ?? undefined,
    weekGroceries: groceryResult.items,
    adherenceMatches: adherenceComputation.matches,
  });
}

async function persistReviewSnapshot(
  store: ReviewStorage,
  weekly: WeeklyReviewData,
  snapshot: ReviewSnapshot = weekly.snapshot
): Promise<WeeklyReviewData> {
  await store.reviewSnapshots.put(snapshot);
  return snapshot === weekly.snapshot
    ? weekly
    : {
        ...weekly,
        snapshot,
      };
}

export async function saveNextWeekExperiment(
  store: ReviewStorage,
  anchorDay: string,
  experiment: string,
  experimentId?: string
): Promise<ReviewSnapshot> {
  const weekly = await buildWeeklySnapshot(store, anchorDay);
  const timestamp = nowIso();

  const snapshot: ReviewSnapshot = {
    ...weekly.snapshot,
    ...updateRecordMeta(weekly.snapshot, weekly.snapshot.id, timestamp),
    experimentId,
    experiment,
  };

  return (await persistReviewSnapshot(store, weekly, snapshot)).snapshot;
}

export async function refreshWeeklyReviewArtifacts(
  store: ReviewStorage,
  anchorDay: string
): Promise<WeeklyReviewData> {
  const weekly = await buildWeeklySnapshot(store, anchorDay);
  return await persistReviewSnapshot(store, weekly);
}

function isDatabaseClosedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'DatabaseClosedError' || /database has been closed/i.test(error.message))
  );
}

export async function refreshWeeklyReviewArtifactsSafely(
  store: ReviewStorage,
  anchorDay: string
): Promise<void> {
  try {
    await refreshWeeklyReviewArtifacts(store, anchorDay);
  } catch (error) {
    if (!isDatabaseClosedError(error)) {
      throw error;
    }
  }
}

export async function refreshWeeklyReviewArtifactsForDaysSafely(
  store: ReviewStorage,
  anchorDays: string[]
): Promise<void> {
  const refreshedWeeks = new Set<string>();

  for (const anchorDay of anchorDays) {
    if (!anchorDay) {
      continue;
    }

    const weekStart = startOfWeek(anchorDay);
    if (refreshedWeeks.has(weekStart)) {
      continue;
    }
    refreshedWeeks.add(weekStart);

    await refreshWeeklyReviewArtifactsSafely(store, anchorDay);
  }
}
