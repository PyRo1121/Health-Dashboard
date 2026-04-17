import { countHealthMetricEvents, matchesHealthMetric } from '$lib/core/domain/health-metrics';
import type {
  DailyRecord,
  FoodCatalogItem,
  HealthEvent,
  PlannedMeal,
} from '$lib/core/domain/types';
import {
  buildNutritionRecommendations,
  type NutritionRecommendation,
} from '$lib/features/nutrition/recommend';
import type { TodayPlannedWorkoutInput, TodayRecoveryAdaptationInput } from './intelligence';

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
  if (
    !recommendation ||
    recommendation.kind !== 'food' ||
    recommendation.subtitle === 'Nutrition totals unknown.'
  ) {
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
