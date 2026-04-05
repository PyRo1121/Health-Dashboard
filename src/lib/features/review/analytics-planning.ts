import type { AdherenceMatch, GroceryItem, PlanSlot, WeeklyPlan } from '$lib/core/domain/types';
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
  matches: AdherenceMatch[]
): ReviewAdherenceScore | null {
  if (!matches.length) {
    return null;
  }

  let completed = 0;
  let missed = 0;
  let pending = 0;
  let inferredCount = 0;

  for (const match of matches) {
    if (match.outcome === 'hit') {
      completed += 1;
    } else if (match.outcome === 'miss') {
      missed += 1;
    } else {
      pending += 1;
    }

    if (match.confidence === 'inferred' && match.outcome !== 'pending') {
      inferredCount += 1;
    }
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
  if (inferredCount > 0) {
    detailParts.push(`${inferredCount} inferred`);
  }

  return {
    label,
    score,
    completed,
    missed,
    pending,
    inferredCount,
    tone: createAdherenceTone(score, missed, pending),
    detail: detailParts.join(', '),
  };
}

function createPlanSignal(match: AdherenceMatch): string | null {
  if (match.outcome === 'pending') {
    return null;
  }

  const slotLabel =
    match.slotType === 'meal' ? 'Meal' : match.slotType === 'workout' ? 'Workout' : 'Note';
  if (match.outcome === 'hit') {
    return `${slotLabel}${match.confidence === 'inferred' ? ' inferred' : ''} hit: ${match.slotTitle} ${match.reason}`;
  }

  return `${slotLabel}${match.confidence === 'inferred' ? ' inferred' : ''} miss: ${match.slotTitle} ${match.reason}`;
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

export function buildAdherenceScores(matches: AdherenceMatch[]): ReviewAdherenceScore[] {
  const overall = createAdherenceScore('Overall', matches);
  const meals = createAdherenceScore(
    'Meals',
    matches.filter((match) => match.slotType === 'meal')
  );
  const workouts = createAdherenceScore(
    'Workouts',
    matches.filter((match) => match.slotType === 'workout')
  );

  return [overall, meals, workouts].filter((score): score is ReviewAdherenceScore =>
    Boolean(score)
  );
}

export function buildAdherenceSignals(matches: AdherenceMatch[]): string[] {
  const prioritized = [...matches].sort((left, right) => {
    const outcomeWeight = { miss: 0, hit: 1, pending: 2 } as const;

    return (
      outcomeWeight[left.outcome] - outcomeWeight[right.outcome] ||
      left.localDay.localeCompare(right.localDay) ||
      left.slotTitle.localeCompare(right.slotTitle)
    );
  });

  return prioritized
    .map((match) => createPlanSignal(match))
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
