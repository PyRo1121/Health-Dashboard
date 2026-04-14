import type { TodayIntelligenceInput, TodayRecommendation } from './intelligence';
import {
  buildDailyRecordProvenance,
  buildEventProvenance,
  buildNutritionProvenance,
  buildPlanProvenance,
  dedupeProvenance,
} from './provenance';

export function buildRecoveryRecommendation(
  input: TodayIntelligenceInput
): TodayRecommendation | null {
  const adaptation = input.recoveryAdaptation;
  if (!adaptation) {
    return null;
  }

  const supportingAction = {
    kind: 'open-journal-recovery-note' as const,
    label: 'Capture recovery note',
  };

  const primaryAction = adaptation.workoutRecommendation
    ? {
        kind: 'recovery-action' as const,
        label: adaptation.workoutRecommendation.actionLabel,
        actionId: adaptation.workoutRecommendation.actionId,
      }
    : adaptation.mealRecommendation
      ? {
          kind: 'recovery-action' as const,
          label: adaptation.mealRecommendation.actionLabel,
          actionId: adaptation.mealRecommendation.actionId,
        }
      : supportingAction;

  const secondaryAction =
    adaptation.workoutRecommendation && adaptation.mealRecommendation
      ? {
          kind: 'recovery-action' as const,
          label: adaptation.mealRecommendation.actionLabel,
          actionId: adaptation.mealRecommendation.actionId,
        }
      : null;

  return {
    id: `recommendation:recovery:${input.date}`,
    kind: 'recovery',
    title:
      primaryAction.kind === 'recovery-action' &&
      primaryAction.actionId === 'apply-recovery-workout'
        ? 'Keep today lighter'
        : 'Protect recovery with the next move',
    summary:
      adaptation.workoutRecommendation?.subtitle ??
      adaptation.mealRecommendation?.subtitle ??
      adaptation.headline,
    confidence: adaptation.level === 'recovery' ? 'high' : 'medium',
    score: adaptation.level === 'recovery' ? 95 : 82,
    reasons: adaptation.reasons.slice(0, 3),
    provenance: dedupeProvenance([
      ...buildDailyRecordProvenance(input),
      ...buildEventProvenance(input.events),
      ...buildPlanProvenance(input),
    ]).slice(0, 4),
    primaryAction,
    secondaryAction,
    supportingAction,
  };
}

export function buildPlannedWorkoutRecommendation(
  input: TodayIntelligenceInput
): TodayRecommendation | null {
  if (!input.plannedWorkout) {
    return null;
  }

  return {
    id: `recommendation:planned-workout:${input.date}`,
    kind: 'planned_workout',
    title: `Keep ${input.plannedWorkout.title} moving`,
    summary: input.plannedWorkout.subtitle,
    confidence: 'medium',
    score: 80,
    reasons: [
      'The workout is already queued for today.',
      'Nothing stronger is beating the plan right now.',
    ],
    provenance: dedupeProvenance(buildPlanProvenance(input)).slice(0, 3),
    primaryAction: {
      kind: 'plan-status',
      label: 'Complete queued workout',
      slotId: input.plannedWorkout.id,
      status: 'done',
    },
    secondaryAction: {
      kind: 'plan-status',
      label: 'Skip queued workout',
      slotId: input.plannedWorkout.id,
      status: 'skipped',
    },
    supportingAction: null,
  };
}

export function buildPlannedMealRecommendation(
  input: TodayIntelligenceInput
): TodayRecommendation | null {
  if (!input.plannedMeal) {
    return null;
  }

  const plannedProtein = input.plannedMeal.protein;
  const plannedFiber = input.plannedMeal.fiber;
  const projectedProtein =
    plannedProtein !== undefined ? input.nutritionSummary.protein + plannedProtein : null;
  const projectedFiber =
    plannedFiber !== undefined ? input.nutritionSummary.fiber + plannedFiber : null;

  return {
    id: `recommendation:planned-meal:${input.date}`,
    kind: 'planned_meal',
    title: `Log ${input.plannedMeal.name} next`,
    summary:
      projectedProtein !== null || projectedFiber !== null
        ? `${input.plannedMeal.mealType} is already queued and changes today's intake more than another unplanned snack.`
        : `${input.plannedMeal.mealType} is already queued, so logging it now keeps plan, Today, and Review aligned.`,
    confidence: 'high',
    score: 76,
    reasons: [
      'The next meal is already planned.',
      projectedProtein !== null && projectedProtein > input.nutritionSummary.protein
        ? 'It materially improves protein pace.'
        : 'It keeps the day structured and lower-friction.',
      projectedFiber !== null && projectedFiber > input.nutritionSummary.fiber
        ? 'It also lifts fiber pace.'
        : 'Logging it now keeps Today and Review aligned.',
    ].slice(0, 3),
    provenance: dedupeProvenance([
      ...buildPlanProvenance(input),
      ...buildNutritionProvenance(input),
    ]).slice(0, 4),
    primaryAction: {
      kind: 'log-planned-meal',
      label: 'Log queued meal',
    },
    secondaryAction: {
      kind: 'clear-planned-meal',
      label: 'Clear queued meal',
    },
    supportingAction: null,
  };
}

export function buildStalePlanRecommendation(
  input: TodayIntelligenceInput
): TodayRecommendation | null {
  const issue = input.plannedMealIssue ?? input.plannedWorkoutIssue;
  if (!issue) {
    return null;
  }

  return {
    id: `recommendation:stale-plan:${input.date}`,
    kind: 'stale_plan_cleanup',
    title: 'Repair the stale plan item',
    summary: issue,
    confidence: 'high',
    score: 74,
    reasons: ['The current handoff cannot be executed until Plan is repaired.'],
    provenance: [
      {
        label: 'Planned item no longer resolves to a live source record.',
        sourceKind: 'plan_slot',
      },
    ],
    primaryAction: {
      kind: 'href',
      label: 'Open Plan',
      href: '/plan',
    },
    secondaryAction: null,
    supportingAction: null,
  };
}

export function buildContextCaptureRecommendation(
  input: TodayIntelligenceInput
): TodayRecommendation | null {
  const hasConcerningSignal =
    !!input.dailyRecord &&
    ((input.dailyRecord.stress ?? 0) >= 4 ||
      (typeof input.dailyRecord.sleepHours === 'number' && input.dailyRecord.sleepHours < 6) ||
      input.events.some(
        (event) => event.eventType === 'symptom' || event.eventType === 'anxiety-episode'
      ));

  if (!hasConcerningSignal || input.latestJournalEntry) {
    return null;
  }

  return {
    id: `recommendation:context-capture:${input.date}`,
    kind: 'context_capture',
    title: 'Capture a quick context note',
    summary: "A short note will make today's signals easier to interpret later.",
    confidence: 'medium',
    score: 68,
    reasons: ['Today has stress or recovery signals without a narrative note attached yet.'],
    provenance: dedupeProvenance([
      ...buildDailyRecordProvenance(input),
      ...buildEventProvenance(input.events),
    ]).slice(0, 4),
    primaryAction: {
      kind: 'open-journal-context-capture',
      label: 'Open Journal',
    },
    secondaryAction: null,
    supportingAction: null,
  };
}

export function buildNutritionSupportRecommendation(
  input: TodayIntelligenceInput
): TodayRecommendation | null {
  if (!input.dailyRecord) {
    return null;
  }

  const proteinLow = input.nutritionSummary.protein < 30;
  const fiberLow = input.nutritionSummary.fiber < 10;
  if (!proteinLow && !fiberLow) {
    return null;
  }

  const provenance = buildNutritionProvenance(input);

  return {
    id: `recommendation:nutrition-support:${input.date}`,
    kind: 'nutrition_support',
    title: 'Set up one stronger meal',
    summary:
      proteinLow && fiberLow
        ? 'Protein and fiber are both still light, so one solid meal changes the day more than another snack.'
        : proteinLow
          ? 'Protein is still light, so one strong meal does more than piecemeal fixes.'
          : 'Fiber is still light, so one structured meal can give the day more shape.',
    confidence: 'low',
    score: 52,
    reasons: provenance.map((row) => row.label).slice(0, 2),
    provenance: provenance.slice(0, 3),
    primaryAction: {
      kind: 'href',
      label: 'Open Nutrition',
      href: '/nutrition',
    },
    secondaryAction: null,
    supportingAction: null,
  };
}
