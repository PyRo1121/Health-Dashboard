import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import { normalizeSafeExternalUrl } from '$lib/core/shared/external-links';
import type { PlannedMeal } from '$lib/core/domain/types';
import type { TodayConfidence, TodayRecommendationAction } from '$lib/features/today/intelligence';
import type { TodayPlannedWorkout, TodaySnapshot } from '$lib/features/today/snapshot';

export interface TodayEventRow {
  id: string;
  label: string;
  valueLabel: string;
  sourceLabel: string;
  referenceUrl?: string;
}

export interface TodayPlanRow {
  id: string;
  title: string;
  subtitle: string;
  status: 'planned' | 'done' | 'skipped';
}

export interface TodayNutritionPulseMetric {
  label: string;
  current: number | null;
  target: number;
  projected: number | null;
  tone: 'steady' | 'boost' | 'strong';
}

const DAILY_NUTRITION_TARGETS = {
  protein: 80,
  fiber: 25,
} as const;

type NutritionMetricKey = 'calories' | 'protein' | 'fiber' | 'carbs' | 'fat';

function hasUnknownLoggedNutritionMetric(
  snapshot: TodaySnapshot,
  key: NutritionMetricKey
): boolean {
  return snapshot.foodEntries.some((entry) => entry[key] === undefined);
}

function createUnknownPaceGuidance(metric: 'protein' | 'fiber'): string {
  return `${metric === 'protein' ? 'Protein' : 'Fiber'} pace is still unknown because one logged meal is missing nutrition totals.`;
}

export function createTodayRecordRows(snapshot: TodaySnapshot | null): string[] {
  if (!snapshot) {
    return [];
  }

  const rows: string[] = [];

  if (snapshot.dailyRecord) {
    rows.push(
      `Sleep: ${snapshot.dailyRecord.sleepHours} hours`,
      `Stress: ${snapshot.dailyRecord.stress}/5`,
      `Focus: ${snapshot.dailyRecord.focus}/5`
    );
    if (snapshot.dailyRecord.freeformNote) {
      rows.push(snapshot.dailyRecord.freeformNote);
    }
  }

  if (snapshot.foodEntries.length) {
    rows.push(`Meals logged: ${snapshot.foodEntries.length}`);
    rows.push(`Latest meal: ${snapshot.foodEntries.at(-1)?.name ?? 'Untitled meal'}`);
  }

  return rows;
}

export function createTodayEventRows(snapshot: TodaySnapshot | null): TodayEventRow[] {
  return (
    snapshot?.events.map((event) => ({
      id: event.id,
      ...buildHealthEventDisplay(event),
      referenceUrl: normalizeSafeExternalUrl(
        typeof event.payload?.referenceUrl === 'string' ? event.payload.referenceUrl : undefined
      ),
    })) ?? []
  );
}

export function createTodayPlanRows(snapshot: TodaySnapshot | null): TodayPlanRow[] {
  return snapshot?.planItems ?? [];
}

export function createPlannedMealRows(plannedMeal: PlannedMeal | null): string[] {
  if (!plannedMeal) {
    return [];
  }

  return [
    `Meal type: ${plannedMeal.mealType}`,
    ...(plannedMeal.calories !== undefined ? [`Calories: ${plannedMeal.calories}`] : []),
    ...(plannedMeal.protein !== undefined ? [`Protein: ${plannedMeal.protein}`] : []),
    ...(plannedMeal.fiber !== undefined ? [`Fiber: ${plannedMeal.fiber}`] : []),
    ...(plannedMeal.carbs !== undefined ? [`Carbs: ${plannedMeal.carbs}`] : []),
    ...(plannedMeal.fat !== undefined ? [`Fat: ${plannedMeal.fat}`] : []),
  ];
}

export function createPlannedWorkoutRows(plannedWorkout: TodayPlannedWorkout | null): string[] {
  return plannedWorkout ? [plannedWorkout.subtitle, `Status: ${plannedWorkout.status}`] : [];
}

export function createTodayNutritionRows(snapshot: TodaySnapshot | null): string[] {
  if (!snapshot) {
    return [];
  }

  return [
    `Calories: ${hasUnknownLoggedNutritionMetric(snapshot, 'calories') ? 'unknown' : snapshot.nutritionSummary.calories}`,
    `Protein: ${hasUnknownLoggedNutritionMetric(snapshot, 'protein') ? 'unknown' : snapshot.nutritionSummary.protein}`,
    `Fiber: ${hasUnknownLoggedNutritionMetric(snapshot, 'fiber') ? 'unknown' : snapshot.nutritionSummary.fiber}`,
    `Carbs: ${hasUnknownLoggedNutritionMetric(snapshot, 'carbs') ? 'unknown' : snapshot.nutritionSummary.carbs}`,
    `Fat: ${hasUnknownLoggedNutritionMetric(snapshot, 'fat') ? 'unknown' : snapshot.nutritionSummary.fat}`,
  ];
}

export function createTodayNutritionPulseMetrics(
  snapshot: TodaySnapshot | null
): TodayNutritionPulseMetric[] {
  if (!snapshot) {
    return [];
  }

  const proteinKnown = !hasUnknownLoggedNutritionMetric(snapshot, 'protein');
  const fiberKnown = !hasUnknownLoggedNutritionMetric(snapshot, 'fiber');

  const projectedProtein = snapshot.plannedMeal
    ? proteinKnown && snapshot.plannedMeal.protein !== undefined
      ? snapshot.nutritionSummary.protein + snapshot.plannedMeal.protein
      : null
    : null;
  const projectedFiber = snapshot.plannedMeal
    ? fiberKnown && snapshot.plannedMeal.fiber !== undefined
      ? snapshot.nutritionSummary.fiber + snapshot.plannedMeal.fiber
      : null
    : null;

  return [
    {
      label: 'Protein pace',
      current: proteinKnown ? snapshot.nutritionSummary.protein : null,
      target: DAILY_NUTRITION_TARGETS.protein,
      projected: projectedProtein,
      tone:
        proteinKnown && snapshot.nutritionSummary.protein >= DAILY_NUTRITION_TARGETS.protein
          ? 'strong'
          : projectedProtein !== null && projectedProtein >= DAILY_NUTRITION_TARGETS.protein * 0.75
            ? 'boost'
            : 'steady',
    },
    {
      label: 'Fiber pace',
      current: fiberKnown ? snapshot.nutritionSummary.fiber : null,
      target: DAILY_NUTRITION_TARGETS.fiber,
      projected: projectedFiber,
      tone:
        fiberKnown && snapshot.nutritionSummary.fiber >= DAILY_NUTRITION_TARGETS.fiber
          ? 'strong'
          : projectedFiber !== null && projectedFiber >= DAILY_NUTRITION_TARGETS.fiber * 0.75
            ? 'boost'
            : 'steady',
    },
  ];
}

export function createTodayNutritionGuidance(snapshot: TodaySnapshot | null): string[] {
  if (!snapshot) {
    return [];
  }

  const guidance: string[] = [];
  const proteinKnown = !hasUnknownLoggedNutritionMetric(snapshot, 'protein');
  const fiberKnown = !hasUnknownLoggedNutritionMetric(snapshot, 'fiber');
  const protein = snapshot.nutritionSummary.protein;
  const fiber = snapshot.nutritionSummary.fiber;
  const plannedProtein = snapshot.plannedMeal?.protein;
  const plannedFiber = snapshot.plannedMeal?.fiber;
  const projectedProtein =
    proteinKnown && plannedProtein !== undefined ? protein + plannedProtein : null;
  const projectedFiber = fiberKnown && plannedFiber !== undefined ? fiber + plannedFiber : null;

  if (snapshot.plannedMeal) {
    if (projectedProtein !== null && projectedProtein >= DAILY_NUTRITION_TARGETS.protein * 0.75) {
      guidance.push('The planned meal meaningfully lifts your protein pace.');
    } else if (projectedProtein !== null && projectedProtein > protein) {
      guidance.push('The planned meal helps, but protein still looks light for the day.');
    }

    if (projectedFiber !== null && projectedFiber >= DAILY_NUTRITION_TARGETS.fiber * 0.75) {
      guidance.push('The planned meal keeps fiber moving in the right direction.');
    } else if (projectedFiber !== null && projectedFiber > fiber) {
      guidance.push('Fiber still needs attention after the planned meal.');
    }

    if (!guidance.length && plannedProtein === undefined && plannedFiber === undefined) {
      guidance.push(
        'The queued meal keeps plan and Today aligned, but its nutrition totals are still unknown.'
      );
    }
  }

  if (!guidance.length) {
    if (!proteinKnown && !fiberKnown) {
      guidance.push(
        "Today's logged meals are missing nutrition totals, so protein and fiber pace are still unknown."
      );
    } else if (!proteinKnown || !fiberKnown) {
      if (proteinKnown && protein < 30) {
        guidance.push(
          'Protein is still low so far. A 20g+ meal would change the day more than another snack.'
        );
      } else if (fiberKnown && fiber < 10) {
        guidance.push(
          'Fiber is still low so far. Oats, beans, berries, or greens would give the day more shape.'
        );
      }

      if (!proteinKnown) {
        guidance.push(createUnknownPaceGuidance('protein'));
      }

      if (!fiberKnown) {
        guidance.push(createUnknownPaceGuidance('fiber'));
      }
    } else if (protein < 30) {
      guidance.push(
        'Protein is still low so far. A 20g+ meal would change the day more than another snack.'
      );
    } else if (fiber < 10) {
      guidance.push(
        'Fiber is still low so far. Oats, beans, berries, or greens would give the day more shape.'
      );
    } else {
      guidance.push(
        'Nutrition is on a steady enough path. Keep the next meal simple and repeatable.'
      );
    }
  }

  return guidance.slice(0, 2);
}

export function createPlannedMealProjectionRows(snapshot: TodaySnapshot | null): string[] {
  if (!snapshot?.plannedMeal) {
    return [];
  }

  const rows = [
    !hasUnknownLoggedNutritionMetric(snapshot, 'calories') &&
    snapshot.plannedMeal.calories !== undefined
      ? `Projected calories: ${snapshot.nutritionSummary.calories + snapshot.plannedMeal.calories}`
      : null,
    !hasUnknownLoggedNutritionMetric(snapshot, 'protein') &&
    snapshot.plannedMeal.protein !== undefined
      ? `Projected protein: ${snapshot.nutritionSummary.protein + snapshot.plannedMeal.protein}`
      : null,
    !hasUnknownLoggedNutritionMetric(snapshot, 'fiber') && snapshot.plannedMeal.fiber !== undefined
      ? `Projected fiber: ${snapshot.nutritionSummary.fiber + snapshot.plannedMeal.fiber}`
      : null,
    !hasUnknownLoggedNutritionMetric(snapshot, 'carbs') && snapshot.plannedMeal.carbs !== undefined
      ? `Projected carbs: ${snapshot.nutritionSummary.carbs + snapshot.plannedMeal.carbs}`
      : null,
    !hasUnknownLoggedNutritionMetric(snapshot, 'fat') && snapshot.plannedMeal.fat !== undefined
      ? `Projected fat: ${snapshot.nutritionSummary.fat + snapshot.plannedMeal.fat}`
      : null,
  ];

  return rows.filter((row): row is string => row !== null);
}

export function createTodayConfidenceLabel(confidence: TodayConfidence): string {
  switch (confidence) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    default:
      return 'Low confidence';
  }
}

export function createTodayRecommendationRows(snapshot: TodaySnapshot | null): string[] {
  const recommendation = snapshot?.intelligence.primaryRecommendation;
  if (!recommendation) {
    return [];
  }

  return [
    createTodayConfidenceLabel(recommendation.confidence),
    ...recommendation.reasons,
    ...recommendation.provenance.map((row) => row.label),
  ];
}

export function createTodayRecommendationSupportRows(snapshot: TodaySnapshot | null): string[] {
  const recommendation = snapshot?.intelligence.primaryRecommendation;
  const rows: string[] = [];

  if (!snapshot || !recommendation) {
    return rows;
  }

  if (snapshot.plannedWorkout) {
    rows.push(`Plan: ${snapshot.plannedWorkout.title} is still queued.`);
  } else if (snapshot.plannedMeal) {
    rows.push(`Plan: ${snapshot.plannedMeal.name} is the next queued meal.`);
  } else if (snapshot.planItems.length) {
    rows.push(`Plan: ${snapshot.planItems.length} item(s) are still queued today.`);
  } else if (snapshot.plannedMealIssue || snapshot.plannedWorkoutIssue) {
    rows.push('Plan: one planned item needs repair before it can be used today.');
  }

  if (
    hasUnknownLoggedNutritionMetric(snapshot, 'protein') &&
    hasUnknownLoggedNutritionMetric(snapshot, 'fiber')
  ) {
    rows.push("Nutrition: today's logged meal totals are still unknown.");
  } else if (hasUnknownLoggedNutritionMetric(snapshot, 'protein')) {
    rows.push(
      `Nutrition: protein pace is unknown; fiber ${snapshot.nutritionSummary.fiber}g so far.`
    );
  } else if (hasUnknownLoggedNutritionMetric(snapshot, 'fiber')) {
    rows.push(
      `Nutrition: protein ${snapshot.nutritionSummary.protein}g so far; fiber pace is unknown.`
    );
  } else {
    rows.push(
      `Nutrition: protein ${snapshot.nutritionSummary.protein}g, fiber ${snapshot.nutritionSummary.fiber}g so far.`
    );
  }

  if (snapshot.recoveryAdaptation) {
    rows.push(...snapshot.recoveryAdaptation.mealFallback.slice(0, 1));
    rows.push(...snapshot.recoveryAdaptation.workoutFallback.slice(0, 1));

    if (snapshot.recoveryAdaptation.mealRecommendation) {
      rows.push(`Recovery meal: ${snapshot.recoveryAdaptation.mealRecommendation.title}.`);
    }

    if (snapshot.recoveryAdaptation.workoutRecommendation) {
      rows.push(`Recovery workout: ${snapshot.recoveryAdaptation.workoutRecommendation.title}.`);
    }
  } else {
    rows.push(`Signals: ${recommendation.summary}`);
  }

  return rows.slice(0, 6);
}

export function isTodayRecommendationHrefAction(
  action: TodayRecommendationAction | null
): action is Extract<TodayRecommendationAction, { kind: 'href' }> {
  return action?.kind === 'href';
}
