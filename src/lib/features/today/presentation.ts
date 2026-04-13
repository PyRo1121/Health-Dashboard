import { buildHealthEventDisplay } from '$lib/core/shared/health-events';
import type { PlannedMeal } from '$lib/core/domain/types';
import type { TodayConfidence, TodayRecommendationAction } from '$lib/features/today/intelligence';
import type { TodayPlannedWorkout, TodaySnapshot } from '$lib/features/today/snapshot';

export interface TodayEventRow {
  id: string;
  label: string;
  valueLabel: string;
  sourceLabel: string;
}

export interface TodayPlanRow {
  id: string;
  title: string;
  subtitle: string;
  status: 'planned' | 'done' | 'skipped';
}

export interface TodayNutritionPulseMetric {
  label: string;
  current: number;
  target: number;
  projected: number | null;
  tone: 'steady' | 'boost' | 'strong';
}

const DAILY_NUTRITION_TARGETS = {
  protein: 80,
  fiber: 25,
} as const;

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
    })) ?? []
  );
}

export function createTodayPlanRows(snapshot: TodaySnapshot | null): TodayPlanRow[] {
  return snapshot?.planItems ?? [];
}

export function createPlannedMealRows(plannedMeal: PlannedMeal | null): string[] {
  return plannedMeal
    ? [
        `Meal type: ${plannedMeal.mealType}`,
        `Calories: ${plannedMeal.calories ?? 0}`,
        `Protein: ${plannedMeal.protein ?? 0}`,
        `Fiber: ${plannedMeal.fiber ?? 0}`,
        `Carbs: ${plannedMeal.carbs ?? 0}`,
        `Fat: ${plannedMeal.fat ?? 0}`,
      ]
    : [];
}

export function createPlannedWorkoutRows(plannedWorkout: TodayPlannedWorkout | null): string[] {
  return plannedWorkout ? [plannedWorkout.subtitle, `Status: ${plannedWorkout.status}`] : [];
}

export function createTodayNutritionRows(snapshot: TodaySnapshot | null): string[] {
  if (!snapshot) {
    return [];
  }

  return [
    `Calories: ${snapshot.nutritionSummary.calories}`,
    `Protein: ${snapshot.nutritionSummary.protein}`,
    `Fiber: ${snapshot.nutritionSummary.fiber}`,
    `Carbs: ${snapshot.nutritionSummary.carbs}`,
    `Fat: ${snapshot.nutritionSummary.fat}`,
  ];
}

export function createTodayNutritionPulseMetrics(
  snapshot: TodaySnapshot | null
): TodayNutritionPulseMetric[] {
  if (!snapshot) {
    return [];
  }

  const projectedProtein = snapshot.plannedMeal
    ? snapshot.nutritionSummary.protein + (snapshot.plannedMeal.protein ?? 0)
    : null;
  const projectedFiber = snapshot.plannedMeal
    ? snapshot.nutritionSummary.fiber + (snapshot.plannedMeal.fiber ?? 0)
    : null;

  return [
    {
      label: 'Protein pace',
      current: snapshot.nutritionSummary.protein,
      target: DAILY_NUTRITION_TARGETS.protein,
      projected: projectedProtein,
      tone:
        snapshot.nutritionSummary.protein >= DAILY_NUTRITION_TARGETS.protein
          ? 'strong'
          : projectedProtein !== null && projectedProtein >= DAILY_NUTRITION_TARGETS.protein * 0.75
            ? 'boost'
            : 'steady',
    },
    {
      label: 'Fiber pace',
      current: snapshot.nutritionSummary.fiber,
      target: DAILY_NUTRITION_TARGETS.fiber,
      projected: projectedFiber,
      tone:
        snapshot.nutritionSummary.fiber >= DAILY_NUTRITION_TARGETS.fiber
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
  const protein = snapshot.nutritionSummary.protein;
  const fiber = snapshot.nutritionSummary.fiber;
  const projectedProtein = protein + (snapshot.plannedMeal?.protein ?? 0);
  const projectedFiber = fiber + (snapshot.plannedMeal?.fiber ?? 0);

  if (snapshot.plannedMeal) {
    if (projectedProtein >= DAILY_NUTRITION_TARGETS.protein * 0.75) {
      guidance.push('The planned meal meaningfully lifts your protein pace.');
    } else if (projectedProtein > protein) {
      guidance.push('The planned meal helps, but protein still looks light for the day.');
    }

    if (projectedFiber >= DAILY_NUTRITION_TARGETS.fiber * 0.75) {
      guidance.push('The planned meal keeps fiber moving in the right direction.');
    } else if (projectedFiber > fiber) {
      guidance.push('Fiber still needs attention after the planned meal.');
    }
  }

  if (!guidance.length) {
    if (protein < 30) {
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

  return [
    `Projected calories: ${snapshot.nutritionSummary.calories + (snapshot.plannedMeal.calories ?? 0)}`,
    `Projected protein: ${snapshot.nutritionSummary.protein + (snapshot.plannedMeal.protein ?? 0)}`,
    `Projected fiber: ${snapshot.nutritionSummary.fiber + (snapshot.plannedMeal.fiber ?? 0)}`,
    `Projected carbs: ${snapshot.nutritionSummary.carbs + (snapshot.plannedMeal.carbs ?? 0)}`,
    `Projected fat: ${snapshot.nutritionSummary.fat + (snapshot.plannedMeal.fat ?? 0)}`,
  ];
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

  rows.push(
    `Nutrition: protein ${snapshot.nutritionSummary.protein}g, fiber ${snapshot.nutritionSummary.fiber}g so far.`
  );

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
