import { countHealthMetricEvents, hasHealthMetricEvent } from '$lib/core/domain/health-metrics';
import type {
  DailyRecord,
  FoodCatalogItem,
  FoodEntry,
  GroceryItem,
  HealthEvent,
  PlanSlot,
  RecipeCatalogItem,
} from '$lib/core/domain/types';
import { buildNutritionRecommendations } from '$lib/features/nutrition/recommend';
import type { ReviewNutritionStrategyItem } from './analytics-shared';
import {
  average,
  averageRecordMetric,
  createStrategyItem,
  groupProteinByDay,
  HIGH_PROTEIN_GRAMS,
  MIN_SLEEP_HOURS,
} from './analytics-shared';

function inferRecommendationMealType(
  records: DailyRecord[],
  foodEntries: FoodEntry[],
  healthEvents: HealthEvent[]
): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const averageProtein = average([...groupProteinByDay(foodEntries).values()]);
  const hadLowSleep = records.some(
    (record) => (record.sleepHours ?? 0) > 0 && (record.sleepHours ?? 0) < MIN_SLEEP_HOURS
  );
  const hadAnxiety = hasHealthMetricEvent(healthEvents, 'anxiety-episode');

  if (averageProtein < HIGH_PROTEIN_GRAMS) return 'breakfast';
  if (hadLowSleep || hadAnxiety) return 'lunch';
  return 'dinner';
}

function findRepeatStrategyCandidate(
  recommendations: ReturnType<typeof buildNutritionRecommendations>,
  loggedNames: Set<string>
) {
  return (
    recommendations.find(
      (candidate) => candidate.kind === 'food' && loggedNames.has(candidate.title)
    ) ?? recommendations.find((candidate) => candidate.kind === 'food')
  );
}

function findSkipStrategyCandidateFromGroceries(
  groceryItems: GroceryItem[],
  recipeCatalogItems: RecipeCatalogItem[],
  planSlots: PlanSlot[]
): ReviewNutritionStrategyItem | null {
  const skippedRecipeSlot = planSlots.find(
    (slot) =>
      slot.status === 'skipped' &&
      slot.slotType === 'meal' &&
      slot.itemType === 'recipe' &&
      slot.itemId
  );
  const skippedRecipeId = skippedRecipeSlot?.itemId;
  if (!skippedRecipeId) return null;

  const excludedGrocery = groceryItems.find(
    (item) => item.excluded && item.sourceRecipeIds.includes(skippedRecipeId)
  );
  if (!excludedGrocery) return null;

  const recipe = recipeCatalogItems.find((candidate) => candidate.id === skippedRecipeId);
  return recipe
    ? createStrategyItem(
        'skip',
        'recipe',
        recipe.id,
        recipe.title,
        'excluded from this week’s grocery run'
      )
    : null;
}

function findSkipStrategyCandidateFromPlanSlots(
  planSlots: PlanSlot[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: RecipeCatalogItem[]
): ReviewNutritionStrategyItem | null {
  const skippedMealSlot = planSlots.find(
    (slot) =>
      slot.status === 'skipped' &&
      slot.slotType === 'meal' &&
      slot.itemId &&
      (slot.itemType === 'food' || slot.itemType === 'recipe')
  );
  if (!skippedMealSlot) return null;

  if (skippedMealSlot.itemType === 'food') {
    const food = foodCatalogItems.find((candidate) => candidate.id === skippedMealSlot.itemId);
    return food
      ? createStrategyItem('skip', 'food', food.id, food.name, 'skipped in the weekly plan')
      : null;
  }

  const recipe = recipeCatalogItems.find((candidate) => candidate.id === skippedMealSlot.itemId);
  return recipe
    ? createStrategyItem('skip', 'recipe', recipe.id, recipe.title, 'skipped in the weekly plan')
    : null;
}

function findRotateStrategyCandidate(
  recommendations: ReturnType<typeof buildNutritionRecommendations>,
  repeatCandidate: ReturnType<typeof findRepeatStrategyCandidate>,
  skipCandidate: ReviewNutritionStrategyItem | null
) {
  return (
    recommendations.find(
      (candidate) => candidate.kind === 'recipe' && candidate.id !== skipCandidate?.recommendationId
    ) ??
    recommendations.find(
      (candidate) =>
        candidate.kind === 'food' &&
        candidate.id !== repeatCandidate?.id &&
        candidate.id !== skipCandidate?.recommendationId
    )
  );
}

export function buildNutritionStrategy(
  records: DailyRecord[],
  foodEntries: FoodEntry[],
  healthEvents: HealthEvent[],
  foodCatalogItems: FoodCatalogItem[],
  recipeCatalogItems: RecipeCatalogItem[],
  planSlots: PlanSlot[] = [],
  groceryItems: GroceryItem[] = []
): ReviewNutritionStrategyItem[] {
  if (!foodCatalogItems.length && !recipeCatalogItems.length) return [];

  const context = {
    mealType: inferRecommendationMealType(records, foodEntries, healthEvents),
    sleepHours: averageRecordMetric(records, (record) => record.sleepHours),
    sleepQuality: averageRecordMetric(records, (record) => record.sleepQuality),
    anxietyCount: countHealthMetricEvents(healthEvents, 'anxiety-episode'),
    symptomCount: countHealthMetricEvents(healthEvents, 'symptom'),
  };

  const recommendations = buildNutritionRecommendations({
    context,
    foods: foodCatalogItems,
    recipes: recipeCatalogItems,
    limit: 6,
  });

  const loggedNames = new Set(
    foodEntries.map((entry) => entry.name?.trim()).filter(Boolean) as string[]
  );
  const repeatCandidate = findRepeatStrategyCandidate(recommendations, loggedNames);
  const strategy: ReviewNutritionStrategyItem[] = [];

  if (repeatCandidate) {
    strategy.push(
      createStrategyItem(
        'repeat',
        repeatCandidate.kind,
        repeatCandidate.id,
        repeatCandidate.title,
        repeatCandidate.reasons[0] ?? repeatCandidate.subtitle
      )
    );
  }

  const skipCandidate =
    findSkipStrategyCandidateFromPlanSlots(planSlots, foodCatalogItems, recipeCatalogItems) ??
    findSkipStrategyCandidateFromGroceries(groceryItems, recipeCatalogItems, planSlots);

  if (skipCandidate) {
    strategy.push(skipCandidate);
  }

  const rotateCandidate = findRotateStrategyCandidate(
    recommendations,
    repeatCandidate,
    skipCandidate
  );

  if (rotateCandidate) {
    strategy.push(
      createStrategyItem(
        'rotate',
        rotateCandidate.kind,
        rotateCandidate.id,
        rotateCandidate.title,
        rotateCandidate.reasons[0] ?? rotateCandidate.subtitle
      )
    );
  }

  return strategy;
}
