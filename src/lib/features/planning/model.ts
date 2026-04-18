import type {
  ExerciseCatalogItem,
  FoodCatalogItem,
  PlanSlot,
  RecipeCatalogItem,
  WorkoutTemplate,
} from '$lib/core/domain/types';

export interface PlanningSlotFormState {
  localDay: string;
  slotType: PlanSlot['slotType'];
  mealSource: 'recipe' | 'food';
  recipeId: string;
  foodCatalogItemId: string;
  workoutTemplateId: string;
  title: string;
  notes: string;
}

export interface PlanningBoardDay {
  localDay: string;
  label: string;
  slots: PlanSlot[];
}

function weekdayLabel(localDay: string): string {
  const date = new Date(`${localDay}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function createPlanningSlotForm(localDay: string): PlanningSlotFormState {
  return {
    localDay,
    slotType: 'meal',
    mealSource: 'recipe',
    recipeId: '',
    foodCatalogItemId: '',
    workoutTemplateId: '',
    title: '',
    notes: '',
  };
}

export function createPlanningBoardDays(weekDays: string[], slots: PlanSlot[]): PlanningBoardDay[] {
  return weekDays.map((localDay) => ({
    localDay,
    label: weekdayLabel(localDay),
    slots: slots.filter((slot) => slot.localDay === localDay),
  }));
}

export function createSlotSummary(
  slot: PlanSlot,
  foods: FoodCatalogItem[],
  recipes: RecipeCatalogItem[],
  workoutTemplates: WorkoutTemplate[],
  exerciseCatalogItems: ExerciseCatalogItem[] = []
): string {
  if (slot.slotType === 'meal' && slot.itemType === 'food' && slot.itemId) {
    const food = foods.find((candidate) => candidate.id === slot.itemId);
    if (!food) {
      return 'Saved food no longer available';
    }

    const nutritionSummary =
      food.protein !== undefined
        ? `${food.protein}g protein`
        : food.calories !== undefined
          ? `${food.calories} kcal`
          : food.fiber !== undefined
            ? `${food.fiber}g fiber`
            : food.carbs !== undefined
              ? `${food.carbs}g carbs`
              : food.fat !== undefined
                ? `${food.fat}g fat`
                : 'Nutrition totals unknown';

    return ['Saved food', food.sourceName, nutritionSummary].filter(Boolean).join(' · ');
  }

  if (slot.slotType === 'meal' && slot.itemId) {
    const recipe = recipes.find((candidate) => candidate.id === slot.itemId);
    return recipe
      ? [recipe.mealType, recipe.cuisine].filter(Boolean).join(' · ') || 'Recipe plan'
      : 'Recipe no longer available';
  }

  if (slot.slotType === 'workout' && slot.itemId) {
    const template = workoutTemplates.find((candidate) => candidate.id === slot.itemId);
    if (!template) {
      return 'Workout template no longer available';
    }

    const exerciseCount = template.exerciseRefs.length;
    const firstExercise = template.exerciseRefs[0];
    const catalogExercise = firstExercise?.exerciseCatalogId
      ? exerciseCatalogItems.find((candidate) => candidate.id === firstExercise.exerciseCatalogId)
      : null;
    const focus = [...(catalogExercise?.muscleGroups ?? []), ...(catalogExercise?.equipment ?? [])]
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ');
    return [
      template.goal ?? 'Workout plan',
      exerciseCount ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}` : '',
      focus,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  return slot.notes || 'Plan note';
}
