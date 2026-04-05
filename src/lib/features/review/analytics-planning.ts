import type { GroceryItem, PlanSlot, WeeklyPlan } from '$lib/core/domain/types';
import type { ReviewAdherenceScore } from './analytics-shared';
import { pluralize } from './analytics-shared';

type ReviewPlanOutcome = 'hit' | 'miss' | 'pending';

function resolvePlanOutcome(slot: PlanSlot, anchorDay: string): ReviewPlanOutcome {
  if (slot.status === 'done') return 'hit';
  if (slot.status === 'skipped') return 'miss';
  return slot.localDay < anchorDay ? 'miss' : 'pending';
}

function createAdherenceTone(
  score: number,
  missed: number,
  pending: number
): ReviewAdherenceScore['tone'] {
  if (missed > 0 && score < 50) return 'attention';
  if (missed > 0 || pending > 0) return 'mixed';
  if (score < 50) return 'attention';
  if (score < 80) return 'mixed';
  return 'steady';
}

function createAdherenceScore(
  label: ReviewAdherenceScore['label'],
  slots: PlanSlot[],
  anchorDay: string
): ReviewAdherenceScore | null {
  if (!slots.length) {
    return null;
  }

  let completed = 0;
  let missed = 0;
  let pending = 0;

  for (const slot of slots) {
    const outcome = resolvePlanOutcome(slot, anchorDay);
    if (outcome === 'hit') {
      completed += 1;
      continue;
    }
    if (outcome === 'miss') {
      missed += 1;
      continue;
    }
    pending += 1;
  }

  const resolved = completed + missed;
  const score = resolved > 0 ? Math.round((completed / resolved) * 100) : 0;
  const detailParts = [
    `${completed} ${pluralize(completed, 'hit')}`,
    `${missed} ${pluralize(missed, 'miss', 'misses')}`,
  ];
  if (pending > 0) {
    detailParts.push(`${pending} upcoming`);
  }

  return {
    label,
    score,
    completed,
    missed,
    pending,
    tone: createAdherenceTone(score, missed, pending),
    detail: detailParts.join(', '),
  };
}

function createPlanSignal(slot: PlanSlot, anchorDay: string): string | null {
  const outcome = resolvePlanOutcome(slot, anchorDay);
  if (outcome === 'pending') {
    return null;
  }

  const slotLabel =
    slot.slotType === 'meal' ? 'Meal' : slot.slotType === 'workout' ? 'Workout' : 'Note';
  if (outcome === 'hit') {
    return `${slotLabel} hit: ${slot.title} was completed as planned.`;
  }

  return `${slotLabel} miss: ${slot.title} ${
    slot.status === 'skipped' ? 'was skipped.' : 'slipped past its planned day.'
  }`;
}

function createPlanCompletionHighlight(weeklyPlan: WeeklyPlan, planSlots: PlanSlot[]): string {
  const doneCount = planSlots.filter((slot) => slot.status === 'done').length;
  const skippedCount = planSlots.filter((slot) => slot.status === 'skipped').length;

  return `${weeklyPlan.title}: ${doneCount}/${planSlots.length || 0} plan item${
    planSlots.length === 1 ? '' : 's'
  } completed${skippedCount ? `, ${skippedCount} skipped` : ''}.`;
}

function createPlanTypeHighlight(
  planSlots: PlanSlot[],
  slotType: PlanSlot['slotType'],
  label: string
): string | null {
  const matchingSlots = planSlots.filter((slot) => slot.slotType === slotType);
  if (!matchingSlots.length) return null;

  const doneCount = matchingSlots.filter((slot) => slot.status === 'done').length;
  return `${label}: ${doneCount}/${matchingSlots.length} completed.`;
}

function createGroceryHighlight(groceryItems: GroceryItem[]): string | null {
  if (!groceryItems.length) return null;

  const checkedCount = groceryItems.filter((item) => item.checked).length;
  const onHandCount = groceryItems.filter((item) => item.onHand).length;
  const excludedCount = groceryItems.filter((item) => item.excluded).length;
  const openCount = groceryItems.filter(
    (item) => !item.checked && !item.onHand && !item.excluded
  ).length;

  return `Groceries: ${checkedCount}/${groceryItems.length} checked${
    onHandCount ? `, ${onHandCount} on hand` : ''
  }${excludedCount ? `, ${excludedCount} excluded` : ''}${openCount ? `, ${openCount} still open` : ''}.`;
}

export function buildPlanningHighlights(
  weeklyPlan: WeeklyPlan | null,
  planSlots: PlanSlot[],
  groceryItems: GroceryItem[]
): string[] {
  if (!weeklyPlan && !planSlots.length && !groceryItems.length) {
    return [];
  }

  const highlights: string[] = [];
  if (weeklyPlan) {
    highlights.push(createPlanCompletionHighlight(weeklyPlan, planSlots));

    const mealHighlight = createPlanTypeHighlight(planSlots, 'meal', 'Meals planned');
    if (mealHighlight) {
      highlights.push(mealHighlight);
    }

    const workoutHighlight = createPlanTypeHighlight(planSlots, 'workout', 'Workouts planned');
    if (workoutHighlight) {
      highlights.push(workoutHighlight);
    }
  }

  const groceryHighlight = createGroceryHighlight(groceryItems);
  if (groceryHighlight) {
    highlights.push(groceryHighlight);
  }

  return highlights.slice(0, 4);
}

export function buildAdherenceScores(
  planSlots: PlanSlot[],
  anchorDay: string
): ReviewAdherenceScore[] {
  const overall = createAdherenceScore('Overall', planSlots, anchorDay);
  const meals = createAdherenceScore(
    'Meals',
    planSlots.filter((slot) => slot.slotType === 'meal'),
    anchorDay
  );
  const workouts = createAdherenceScore(
    'Workouts',
    planSlots.filter((slot) => slot.slotType === 'workout'),
    anchorDay
  );

  return [overall, meals, workouts].filter((score): score is ReviewAdherenceScore =>
    Boolean(score)
  );
}

export function buildAdherenceSignals(planSlots: PlanSlot[], anchorDay: string): string[] {
  const prioritized = [...planSlots].sort((left, right) => {
    const leftOutcome = resolvePlanOutcome(left, anchorDay);
    const rightOutcome = resolvePlanOutcome(right, anchorDay);
    const outcomeWeight = { miss: 0, hit: 1, pending: 2 } as const;

    return (
      outcomeWeight[leftOutcome] - outcomeWeight[rightOutcome] ||
      left.localDay.localeCompare(right.localDay) ||
      left.order - right.order
    );
  });

  return prioritized
    .map((slot) => createPlanSignal(slot, anchorDay))
    .filter((signal): signal is string => Boolean(signal))
    .slice(0, 4);
}

export function buildGrocerySignals(
  planSlots: PlanSlot[],
  groceryItems: GroceryItem[],
  anchorDay: string
): string[] {
  const signals: string[] = [];
  const missedRecipes = new Map<string, string>();

  for (const slot of planSlots) {
    if (
      slot.slotType === 'meal' &&
      slot.itemType === 'recipe' &&
      slot.itemId &&
      resolvePlanOutcome(slot, anchorDay) === 'miss'
    ) {
      missedRecipes.set(slot.itemId, slot.title);
    }
  }

  for (const [recipeId, title] of missedRecipes) {
    const linkedGroceries = groceryItems.filter((item) => item.sourceRecipeIds.includes(recipeId));
    if (!linkedGroceries.length) {
      continue;
    }

    const sourcedCount = linkedGroceries.filter((item) => item.checked || item.onHand).length;
    const unresolvedCount = linkedGroceries.filter(
      (item) => item.excluded || (!item.checked && !item.onHand)
    ).length;

    if (sourcedCount > 0) {
      signals.push(
        `Potential waste: ${title} was missed after ${sourcedCount} ${pluralize(
          sourcedCount,
          'grocery item'
        )} had already been sourced.`
      );
    }

    if (unresolvedCount > 0) {
      signals.push(
        `Grocery miss: ${title} still had ${unresolvedCount} unresolved ${pluralize(
          unresolvedCount,
          'grocery item'
        )} when the meal was missed.`
      );
    }
  }

  return signals.slice(0, 4);
}
