import type { ReviewDecisionCard, ReviewWeeklyRecommendation } from './analytics';
import type {
  RecommendationEngineInput,
  ReviewRecommendationCandidate,
} from './recommendation-engine-shared';
import {
  buildReviewRecommendationTarget,
  clampNumber,
  createRecommendationAction,
  createRecommendationImpact,
  createRecommendationSummary,
  createRecommendationTitle,
  dedupeRecommendationLines,
  deriveRecommendationConfidence,
  findAdherenceScore,
  toDecision,
  toTargetFromStrategy,
} from './recommendation-engine-shared';
import {
  buildReviewExperimentCandidates,
  buildSavedExperimentVerdict,
  resolveSelectedExperimentId,
} from './recommendation-experiments';

export function buildWhatChangedEnoughToMatter(input: {
  correlations: RecommendationEngineInput['snapshot']['correlations'];
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

function createStrategyRecommendationCandidate(input: {
  item: RecommendationEngineInput['nutritionStrategy'][number];
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

export function buildWeeklyDecisionCards(input: RecommendationEngineInput): ReviewDecisionCard[] {
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

export function buildWeeklyRecommendation(
  input: RecommendationEngineInput
): ReviewWeeklyRecommendation | null {
  return buildWeeklyRecommendationCandidates(input)[0] ?? null;
}

export {
  buildReviewExperimentCandidates,
  buildSavedExperimentVerdict,
  resolveSelectedExperimentId,
};
