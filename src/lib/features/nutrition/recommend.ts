import type { FoodCatalogItem, RecipeCatalogItem } from '$lib/core/domain/types';

export interface NutritionRecommendationContext {
  mealType: string;
  sleepHours?: number;
  sleepQuality?: number;
  anxietyCount: number;
  symptomCount: number;
}

export interface NutritionRecommendation {
  id: string;
  kind: 'food' | 'recipe';
  title: string;
  subtitle: string;
  score: number;
  reasons: string[];
}

const FOOD_TARGETS = {
  breakfast: { protein: 20, fiber: 6, calories: [250, 500] as const },
  lunch: { protein: 28, fiber: 8, calories: [350, 700] as const },
  dinner: { protein: 30, fiber: 8, calories: [400, 800] as const },
  snack: { protein: 12, fiber: 4, calories: [100, 300] as const },
} as const;

const PROTEIN_KEYWORDS = [
  'chicken',
  'turkey',
  'beef',
  'salmon',
  'tuna',
  'egg',
  'tofu',
  'beans',
  'lentil',
  'yogurt',
];
const FIBER_KEYWORDS = [
  'beans',
  'lentil',
  'chickpea',
  'oat',
  'broccoli',
  'spinach',
  'kale',
  'quinoa',
  'brown rice',
  'vegetable',
];
const LIGHT_KEYWORDS = ['salad', 'soup', 'stew', 'grill', 'grilled', 'baked'];
const BREAKFAST_KEYWORDS = ['breakfast', 'omelette', 'oat', 'porridge', 'egg'];

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function targetForMealType(mealType: string) {
  return FOOD_TARGETS[mealType as keyof typeof FOOD_TARGETS] ?? FOOD_TARGETS.lunch;
}

function needsSteadyEnergy(context: NutritionRecommendationContext): boolean {
  return (
    (context.sleepQuality !== undefined && context.sleepQuality <= 3) ||
    (context.sleepHours !== undefined && context.sleepHours < 7) ||
    context.anxietyCount > 0
  );
}

function keywordHits(text: string, keywords: string[]): number {
  const normalized = text.toLowerCase();
  return keywords.reduce((count, keyword) => (normalized.includes(keyword) ? count + 1 : count), 0);
}

function createFoodRecommendationSubtitle(item: FoodCatalogItem): string {
  const rows = [
    [
      item.calories !== undefined ? `${item.calories} kcal` : null,
      item.protein !== undefined ? `${item.protein}g protein` : null,
      item.fiber !== undefined ? `${item.fiber}g fiber` : null,
    ],
    [
      item.carbs !== undefined ? `${item.carbs}g carbs` : null,
      item.fat !== undefined ? `${item.fat}g fat` : null,
    ],
  ]
    .map((row) => row.filter((value): value is string => value !== null).join(' · '))
    .filter((row) => row.length > 0);

  return rows.join(' · ') || 'Nutrition totals unknown.';
}

function scoreFood(
  item: FoodCatalogItem,
  context: NutritionRecommendationContext
): NutritionRecommendation {
  const target = targetForMealType(context.mealType);
  const protein = item.protein;
  const fiber = item.fiber;
  const calories = item.calories;
  const carbs = item.carbs;
  const fat = item.fat;
  const [minCalories, maxCalories] = target.calories;
  const knownMetricCount = [protein, fiber, calories, carbs, fat].filter(
    (value) => value !== undefined
  ).length;
  let score = knownMetricCount === 0 ? 18 : 40;
  const reasons: string[] = [];

  if (protein !== undefined) {
    score += clamp((protein / target.protein) * 30, 0, 30);
    if (protein >= target.protein * 0.8) reasons.push('protein target looks strong');
  }

  if (fiber !== undefined) {
    score += clamp((fiber / target.fiber) * 20, 0, 20);
    if (fiber >= target.fiber * 0.8) reasons.push('fiber target looks strong');
  }

  if (calories !== undefined) {
    if (calories >= minCalories && calories <= maxCalories) {
      score += 20;
      reasons.push('calorie range fits this meal');
    } else {
      score -= Math.min(
        20,
        Math.abs((calories < minCalories ? minCalories - calories : calories - maxCalories) / 25)
      );
    }
  }

  if (needsSteadyEnergy(context)) {
    let steadyEnergyEvidence = false;

    if (protein !== undefined && protein >= target.protein * 0.8) {
      score += 10;
      steadyEnergyEvidence = true;
    }
    if (fiber !== undefined && fiber >= target.fiber * 0.8) {
      score += 10;
      steadyEnergyEvidence = true;
    }
    if (carbs !== undefined && carbs >= 20 && carbs <= 55) {
      score += 8;
      reasons.push('carb range supports steadier energy');
      steadyEnergyEvidence = true;
    }
    if (fat !== undefined && fat > 22) {
      score -= 8;
      reasons.push('higher fat load may feel heavier on low-sleep days');
    }
    if (calories !== undefined && calories > maxCalories + 150) score -= 15;
    if (steadyEnergyEvidence) {
      reasons.push('good fit for a steadier-energy day');
    }
  }

  if (!reasons.length) {
    reasons.push(
      knownMetricCount === 0
        ? 'nutrition totals are still unknown, so treat this as a saved rotation idea.'
        : 'saved food with partial nutrition detail'
    );
  }

  return {
    id: item.id,
    kind: 'food',
    title: item.name,
    subtitle: createFoodRecommendationSubtitle(item),
    score: Math.round(score),
    reasons,
  };
}

function scoreRecipe(
  item: RecipeCatalogItem,
  context: NutritionRecommendationContext
): NutritionRecommendation {
  const combined = `${item.title} ${item.ingredients.join(' ')} ${item.mealType ?? ''} ${item.cuisine ?? ''}`;
  let score = 35;
  const reasons: string[] = [];

  const proteinHits = keywordHits(combined, PROTEIN_KEYWORDS);
  const fiberHits = keywordHits(combined, FIBER_KEYWORDS);
  const lightHits = keywordHits(combined, LIGHT_KEYWORDS);
  const breakfastHits = keywordHits(combined, BREAKFAST_KEYWORDS);

  score += proteinHits * 8;
  if (proteinHits > 0) reasons.push('protein-forward ingredients');

  score += fiberHits * 7;
  if (fiberHits > 0) reasons.push('fiber-friendly ingredients');

  if (needsSteadyEnergy(context) && lightHits > 0) {
    score += 12;
    reasons.push('lighter meal style for low-sleep or anxious days');
  }

  if (context.mealType === 'breakfast' && breakfastHits > 0) {
    score += 12;
    reasons.push('breakfast fit');
  }

  if (item.mealType === context.mealType) {
    score += 10;
    reasons.push('meal type already lines up');
  }

  if (!reasons.length) reasons.push('useful recipe idea to widen your meal rotation');

  return {
    id: item.id,
    kind: 'recipe',
    title: item.title,
    subtitle: [item.mealType, item.cuisine].filter(Boolean).join(' · ') || item.sourceName,
    score: Math.round(score),
    reasons,
  };
}

export function buildNutritionRecommendations(input: {
  context: NutritionRecommendationContext;
  foods: FoodCatalogItem[];
  recipes: RecipeCatalogItem[];
  limit?: number;
}): NutritionRecommendation[] {
  const foodRecommendations = input.foods.map((item) => scoreFood(item, input.context));
  const recipeRecommendations = input.recipes.map((item) => scoreRecipe(item, input.context));

  return [...foodRecommendations, ...recipeRecommendations]
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, input.limit ?? 5);
}
