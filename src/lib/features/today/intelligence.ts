import { countHealthMetricEvents, matchesHealthMetric } from '$lib/core/domain/health-metrics';
import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import type {
  DailyRecord,
  FoodCatalogItem,
  HealthEvent,
  JournalEntry,
  PlanSlot,
  PlannedMeal,
} from '$lib/core/domain/types';
import {
  buildNutritionRecommendations,
  type NutritionRecommendation,
} from '$lib/features/nutrition/recommend';

export type TodayConfidence = 'high' | 'medium' | 'low';

export type TodayRecommendationKind =
  | 'recovery'
  | 'planned_meal'
  | 'planned_workout'
  | 'stale_plan_cleanup'
  | 'context_capture'
  | 'nutrition_support';

export interface TodayProvenanceRow {
  label: string;
  sourceKind: 'daily_record' | 'health_event' | 'plan_slot' | 'nutrition_summary' | 'journal';
  sourceId?: string;
}

export type TodayRecoveryActionId =
  | 'skip-workout'
  | 'clear-planned-meal'
  | 'apply-recovery-meal'
  | 'apply-recovery-workout';

export type TodayRecommendationAction =
  | { kind: 'recovery-action'; label: string; actionId: TodayRecoveryActionId }
  | { kind: 'log-planned-meal'; label: string }
  | { kind: 'clear-planned-meal'; label: string }
  | { kind: 'plan-status'; label: string; slotId: string; status: PlanSlot['status'] }
  | { kind: 'open-journal-recovery-note'; label: string }
  | { kind: 'open-journal-context-capture'; label: string }
  | { kind: 'href'; label: string; href: string };

export interface TodayRecommendation {
  id: string;
  kind: TodayRecommendationKind;
  title: string;
  summary: string;
  confidence: TodayConfidence;
  score: number;
  reasons: string[];
  provenance: TodayProvenanceRow[];
  primaryAction: TodayRecommendationAction;
  secondaryAction: TodayRecommendationAction | null;
  supportingAction: TodayRecommendationAction | null;
}

export interface TodayFallbackState {
  title: string;
  message: string;
  action: TodayRecommendationAction | null;
}

export interface TodayIntelligenceResult {
  primaryRecommendation: TodayRecommendation | null;
  fallbackState: TodayFallbackState | null;
}

export interface TodayRecoveryRecommendation {
  title: string;
  subtitle: string;
  reasons: string[];
  actionId: 'apply-recovery-meal' | 'apply-recovery-workout';
  actionLabel: string;
}

export interface TodayRecoveryAdaptationInput {
  level: 'lighter-day' | 'recovery';
  headline: string;
  reasons: string[];
  mealFallback: string[];
  workoutFallback: string[];
  mealRecommendation: TodayRecoveryRecommendation | null;
  workoutRecommendation: TodayRecoveryRecommendation | null;
  actions: Array<{
    id: TodayRecoveryActionId;
    label: string;
  }>;
}

export interface TodayPlannedWorkoutInput {
  id: string;
  title: string;
  subtitle: string;
  status: PlanSlot['status'];
}

export interface TodayIntelligenceInput {
  date: string;
  dailyRecord: DailyRecord | null;
  nutritionSummary: {
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    fat: number;
  };
  plannedMeal: PlannedMeal | null;
  plannedMealIssue: string | null;
  plannedWorkout: TodayPlannedWorkoutInput | null;
  plannedWorkoutIssue: string | null;
  recoveryAdaptation: TodayRecoveryAdaptationInput | null;
  latestJournalEntry: JournalEntry | null;
  events: HealthEvent[];
  planItemsCount: number;
}

const DAILY_NUTRITION_TARGETS = {
  protein: 80,
  fiber: 25,
} as const;

function buildDailyRecordProvenance(input: TodayIntelligenceInput): TodayProvenanceRow[] {
  const rows: TodayProvenanceRow[] = [];
  const record = input.dailyRecord;
  if (!record) {
    return rows;
  }

  if (typeof record.sleepHours === 'number') {
    rows.push({
      label: `Sleep hours: ${record.sleepHours}, daily check-in`,
      sourceKind: 'daily_record',
      sourceId: record.id,
    });
  }

  if (typeof record.sleepQuality === 'number' && record.sleepQuality <= 3) {
    rows.push({
      label: `Sleep quality: ${record.sleepQuality}/5, daily check-in`,
      sourceKind: 'daily_record',
      sourceId: record.id,
    });
  }

  return rows;
}

function buildEventProvenance(events: HealthEvent[]): TodayProvenanceRow[] {
  return events.slice(0, 2).map((event) => {
    const display = buildHealthEventDisplay(event);
    return {
      label: `${display.label}: ${display.valueLabel}, ${display.sourceLabel.toLowerCase()}`,
      sourceKind: 'health_event',
      sourceId: event.id,
    };
  });
}

function buildPlanProvenance(input: TodayIntelligenceInput): TodayProvenanceRow[] {
  const rows: TodayProvenanceRow[] = [];

  if (input.plannedWorkout) {
    rows.push({
      label: `Planned workout: ${input.plannedWorkout.title}, weekly plan`,
      sourceKind: 'plan_slot',
      sourceId: input.plannedWorkout.id,
    });
  }

  if (input.plannedMeal) {
    rows.push({
      label: `Planned meal: ${input.plannedMeal.name}, weekly plan`,
      sourceKind: 'plan_slot',
    });
  }

  return rows;
}

function buildNutritionProvenance(input: TodayIntelligenceInput): TodayProvenanceRow[] {
  const rows: TodayProvenanceRow[] = [];

  if (input.nutritionSummary.protein < DAILY_NUTRITION_TARGETS.protein) {
    rows.push({
      label: `Protein pace: ${input.nutritionSummary.protein} / ${DAILY_NUTRITION_TARGETS.protein}g`,
      sourceKind: 'nutrition_summary',
    });
  }

  if (input.nutritionSummary.fiber < DAILY_NUTRITION_TARGETS.fiber) {
    rows.push({
      label: `Fiber pace: ${input.nutritionSummary.fiber} / ${DAILY_NUTRITION_TARGETS.fiber}g`,
      sourceKind: 'nutrition_summary',
    });
  }

  return rows;
}

function dedupeProvenance(rows: TodayProvenanceRow[]): TodayProvenanceRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.sourceKind}:${row.sourceId ?? row.label}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function summarizeRecoveryReasons(
  dailyRecord: DailyRecord | null,
  events: HealthEvent[]
): { level: TodayRecoveryAdaptationInput['level']; reasons: string[] } | null {
  const recoveryReasons = new Set<string>();
  const lighterReasons = new Set<string>();

  const sleepHours = dailyRecord?.sleepHours;
  if (typeof sleepHours === 'number') {
    if (sleepHours < 6) {
      recoveryReasons.add('Sleep landed under 6 hours.');
    } else if (sleepHours < 7) {
      lighterReasons.add('Sleep landed under 7 hours.');
    }
  }

  const sleepQuality = dailyRecord?.sleepQuality;
  if (typeof sleepQuality === 'number') {
    if (sleepQuality <= 2) {
      recoveryReasons.add('Sleep quality is dragging today.');
    } else if (sleepQuality <= 3) {
      lighterReasons.add('Sleep quality is softer than usual today.');
    }
  }

  for (const event of events) {
    if (matchesHealthMetric(event.eventType, 'symptom')) {
      const severity =
        typeof event.payload?.severity === 'number'
          ? event.payload.severity
          : typeof event.value === 'number'
            ? event.value
            : null;
      if (severity !== null) {
        if (severity >= 4) {
          recoveryReasons.add('Symptom load is elevated today.');
        } else if (severity >= 3) {
          lighterReasons.add('Symptoms are present enough to simplify the day.');
        }
      }
    }

    if (matchesHealthMetric(event.eventType, 'anxiety-episode')) {
      const intensity =
        typeof event.payload?.intensity === 'number'
          ? event.payload.intensity
          : typeof event.value === 'number'
            ? event.value
            : null;
      if (intensity !== null) {
        if (intensity >= 7) {
          recoveryReasons.add('Anxiety intensity spiked today.');
        } else if (intensity >= 5) {
          lighterReasons.add('Anxiety is elevated enough to lower friction.');
        }
      }
    }
  }

  if (recoveryReasons.size) {
    return {
      level: 'recovery',
      reasons: [...recoveryReasons],
    };
  }

  if (lighterReasons.size) {
    return {
      level: 'lighter-day',
      reasons: [...lighterReasons],
    };
  }

  return null;
}

function buildRecoveryMealFallback(
  plannedMeal: PlannedMeal | null,
  level: TodayRecoveryAdaptationInput['level']
): string[] {
  if (plannedMeal) {
    return [
      level === 'recovery'
        ? 'Meal fallback: keep the next meal familiar, easy, and protein-forward.'
        : `Meal fallback: keep ${plannedMeal.name} simple and skip any extra decision-making.`,
    ];
  }

  return [
    level === 'recovery'
      ? 'Meal fallback: repeat one easy meal you already trust instead of improvising.'
      : 'Meal fallback: pick one familiar meal and keep the rest of the day light.',
  ];
}

function buildRecoveryWorkoutFallback(
  plannedWorkout: TodayPlannedWorkoutInput | null,
  level: TodayRecoveryAdaptationInput['level']
): string[] {
  if (plannedWorkout) {
    return [
      level === 'recovery'
        ? `Workout fallback: downgrade ${plannedWorkout.title} to a short walk, mobility reset, or full rest.`
        : `Workout fallback: trim ${plannedWorkout.title} to the first block or swap to easy movement.`,
    ];
  }

  return [
    level === 'recovery'
      ? 'Workout fallback: skip intensity today and protect recovery.'
      : 'Workout fallback: keep movement gentle with a walk, mobility, or a short reset.',
  ];
}

function toTodayMealRecommendation(
  recommendation: NutritionRecommendation | undefined
): TodayRecoveryAdaptationInput['mealRecommendation'] {
  if (!recommendation || recommendation.kind !== 'food') {
    return null;
  }

  return {
    title: recommendation.title,
    subtitle: recommendation.subtitle,
    reasons: recommendation.reasons,
    actionId: 'apply-recovery-meal',
    actionLabel: 'Swap to recovery meal',
  };
}

function deriveRecoveryMealRecommendation(
  dailyRecord: DailyRecord | null,
  events: HealthEvent[],
  plannedMeal: PlannedMeal | null,
  foodCatalogItems: FoodCatalogItem[]
): TodayRecoveryAdaptationInput['mealRecommendation'] {
  if (!plannedMeal) {
    return null;
  }

  return toTodayMealRecommendation(
    buildNutritionRecommendations({
      context: {
        mealType: plannedMeal.mealType || 'meal',
        sleepHours: dailyRecord?.sleepHours,
        sleepQuality: dailyRecord?.sleepQuality,
        anxietyCount: countHealthMetricEvents(events, 'anxiety-episode'),
        symptomCount: countHealthMetricEvents(events, 'symptom'),
      },
      foods: foodCatalogItems.filter((item) => item.name !== plannedMeal.name),
      recipes: [],
      limit: 1,
    })[0]
  );
}

function deriveRecoveryWorkoutRecommendation(
  plannedWorkout: TodayPlannedWorkoutInput | null
): TodayRecoveryAdaptationInput['workoutRecommendation'] {
  if (!plannedWorkout) {
    return null;
  }

  return {
    title: 'Recovery walk',
    subtitle: '10-20 minutes · easy pace · optional mobility',
    reasons: ['Keeps movement without asking for intensity.'],
    actionId: 'apply-recovery-workout',
    actionLabel: 'Swap to recovery walk',
  };
}

function buildRecoveryActions(
  plannedMeal: PlannedMeal | null,
  plannedWorkout: TodayPlannedWorkoutInput | null,
  mealRecommendation: TodayRecoveryAdaptationInput['mealRecommendation'],
  workoutRecommendation: TodayRecoveryAdaptationInput['workoutRecommendation']
): TodayRecoveryAdaptationInput['actions'] {
  const actions: TodayRecoveryAdaptationInput['actions'] = [];

  if (mealRecommendation) {
    actions.push({
      id: mealRecommendation.actionId,
      label: mealRecommendation.actionLabel,
    });
  } else if (plannedMeal) {
    actions.push({
      id: 'clear-planned-meal',
      label: 'Clear queued meal',
    });
  }

  if (workoutRecommendation) {
    actions.push({
      id: workoutRecommendation.actionId,
      label: workoutRecommendation.actionLabel,
    });
  } else if (plannedWorkout && plannedWorkout.status === 'planned') {
    actions.push({
      id: 'skip-workout',
      label: 'Skip queued workout',
    });
  }

  return actions;
}

export function buildTodayRecoveryAdaptation(input: {
  dailyRecord: DailyRecord | null;
  events: HealthEvent[];
  plannedMeal: PlannedMeal | null;
  plannedWorkout: TodayPlannedWorkoutInput | null;
  foodCatalogItems: FoodCatalogItem[];
}): TodayRecoveryAdaptationInput | null {
  const recoverySummary = summarizeRecoveryReasons(input.dailyRecord, input.events);
  if (!recoverySummary) {
    return null;
  }

  const mealRecommendation = deriveRecoveryMealRecommendation(
    input.dailyRecord,
    input.events,
    input.plannedMeal,
    input.foodCatalogItems
  );
  const workoutRecommendation = deriveRecoveryWorkoutRecommendation(input.plannedWorkout);

  return {
    level: recoverySummary.level,
    headline:
      recoverySummary.level === 'recovery'
        ? 'Recovery mode: simplify the day.'
        : 'Lighter day: reduce friction, not momentum.',
    reasons: recoverySummary.reasons,
    mealFallback: buildRecoveryMealFallback(input.plannedMeal, recoverySummary.level),
    workoutFallback: buildRecoveryWorkoutFallback(input.plannedWorkout, recoverySummary.level),
    mealRecommendation,
    workoutRecommendation,
    actions: buildRecoveryActions(
      input.plannedMeal,
      input.plannedWorkout,
      mealRecommendation,
      workoutRecommendation
    ),
  };
}

function buildRecoveryRecommendation(input: TodayIntelligenceInput): TodayRecommendation | null {
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

function buildPlannedWorkoutRecommendation(
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

function buildPlannedMealRecommendation(input: TodayIntelligenceInput): TodayRecommendation | null {
  if (!input.plannedMeal) {
    return null;
  }

  const projectedProtein = input.nutritionSummary.protein + (input.plannedMeal.protein ?? 0);
  const projectedFiber = input.nutritionSummary.fiber + (input.plannedMeal.fiber ?? 0);

  return {
    id: `recommendation:planned-meal:${input.date}`,
    kind: 'planned_meal',
    title: `Log ${input.plannedMeal.name} next`,
    summary: `${input.plannedMeal.mealType} is already queued and changes today's intake more than another unplanned snack.`,
    confidence: 'high',
    score: 76,
    reasons: [
      'The next meal is already planned.',
      projectedProtein > input.nutritionSummary.protein
        ? 'It materially improves protein pace.'
        : 'It keeps the day structured and lower-friction.',
      projectedFiber > input.nutritionSummary.fiber
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

function buildStalePlanRecommendation(input: TodayIntelligenceInput): TodayRecommendation | null {
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

function buildContextCaptureRecommendation(
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
    summary: 'A short note will make today\'s signals easier to interpret later.',
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

function buildNutritionSupportRecommendation(
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

function buildTodayFallbackState(input: TodayIntelligenceInput): TodayFallbackState {
  if (!input.dailyRecord) {
    return {
      title: 'No strong recommendation yet.',
      message: 'Start with today\'s check-in to unlock the rest of Today.',
      action: {
        kind: 'href',
        label: 'Open check-in',
        href: '#today-check-in',
      },
    };
  }

  return {
    title: 'No strong recommendation yet.',
    message: input.planItemsCount
      ? 'Stay with the planned day and keep logging signals.'
      : 'Keep logging signals and use the next section that matches the day.',
    action: input.planItemsCount
      ? {
          kind: 'href',
          label: 'Open Plan',
          href: '/plan',
        }
      : null,
  };
}

export function buildTodayIntelligence(input: TodayIntelligenceInput): TodayIntelligenceResult {
  const primaryRecommendation =
    buildRecoveryRecommendation(input) ??
    buildPlannedWorkoutRecommendation(input) ??
    buildPlannedMealRecommendation(input) ??
    buildStalePlanRecommendation(input) ??
    buildContextCaptureRecommendation(input) ??
    buildNutritionSupportRecommendation(input) ??
    null;

  return {
    primaryRecommendation,
    fallbackState: primaryRecommendation ? null : buildTodayFallbackState(input),
  };
}
