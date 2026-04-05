import type { HealthDatabase } from '$lib/core/db/types';
import type { GroceryItem, PlanSlot } from '$lib/core/domain/types';
import { setGroceryItemState } from '$lib/features/groceries/service';
import { createWorkoutTemplateForm, normalizeExerciseDrafts } from '$lib/features/movement/model';
import { saveWorkoutTemplate } from '$lib/features/movement/service';
import { deletePlanSlot, movePlanSlot, savePlanSlot, updatePlanSlotStatus } from './service';
import { createPlanningSlotForm } from './model';
import { type PlanningPageState, reloadPlanningPageState } from './state';

export async function savePlanningSlotPage(
  db: HealthDatabase,
  state: PlanningPageState
): Promise<PlanningPageState> {
  if (!state.weeklyPlan) {
    return state;
  }

  const slotType = state.slotForm.slotType;
  if (slotType === 'meal') {
    if (state.slotForm.mealSource === 'recipe' && !state.slotForm.recipeId) {
      return {
        ...state,
        planNotice: 'Choose a recipe before adding a meal slot.',
      };
    }

    if (state.slotForm.mealSource === 'food' && !state.slotForm.foodCatalogItemId) {
      return {
        ...state,
        planNotice: 'Choose a saved food before adding a meal slot.',
      };
    }
  }

  if (slotType === 'workout' && !state.slotForm.workoutTemplateId) {
    return {
      ...state,
      planNotice: 'Choose a workout template before adding a workout slot.',
    };
  }

  let title = state.slotForm.title.trim();
  let itemType: PlanSlot['itemType'] = 'freeform';
  let itemId: string | undefined;

  if (slotType === 'meal') {
    if (state.slotForm.mealSource === 'recipe') {
      const recipe = await db.recipeCatalogItems.get(state.slotForm.recipeId);
      if (!recipe) {
        return {
          ...state,
          planNotice: 'That recipe no longer exists. Choose another before adding it to the week.',
        };
      }
      title = recipe.title;
      itemType = 'recipe';
      itemId = recipe.id;
    } else {
      const food = await db.foodCatalogItems.get(state.slotForm.foodCatalogItemId);
      if (!food) {
        return {
          ...state,
          planNotice:
            'That saved food no longer exists. Choose another before adding it to the week.',
        };
      }
      title = food.name;
      itemType = 'food';
      itemId = food.id;
    }
  }

  if (slotType === 'workout') {
    const template = await db.workoutTemplates.get(state.slotForm.workoutTemplateId);
    if (!template) {
      return {
        ...state,
        planNotice:
          'That workout template no longer exists. Choose another before adding it to the week.',
      };
    }
    title = template.title;
    itemType = 'workout-template';
    itemId = template.id;
  }

  await savePlanSlot(db, {
    weeklyPlanId: state.weeklyPlan.id,
    localDay: state.slotForm.localDay,
    slotType,
    itemType,
    itemId,
    title,
    notes: state.slotForm.notes,
  });

  return await reloadPlanningPageState(db, state, {
    planNotice: 'Plan slot saved.',
    slotForm: createPlanningSlotForm(state.slotForm.localDay),
  });
}

export async function saveWorkoutTemplatePage(
  db: HealthDatabase,
  state: PlanningPageState
): Promise<PlanningPageState> {
  const exerciseRefs = normalizeExerciseDrafts(state.workoutTemplateForm.exercises);
  await saveWorkoutTemplate(db, {
    title: state.workoutTemplateForm.title,
    goal: state.workoutTemplateForm.goal,
    exerciseRefs,
  });

  return await reloadPlanningPageState(db, state, {
    workoutTemplateNotice: 'Workout template saved.',
    workoutTemplateForm: createWorkoutTemplateForm(),
  });
}

export async function markPlanningSlotStatusPage(
  db: HealthDatabase,
  state: PlanningPageState,
  slotId: string,
  status: PlanSlot['status']
): Promise<PlanningPageState> {
  await updatePlanSlotStatus(db, slotId, status);
  return await reloadPlanningPageState(db, state, {
    planNotice: `Plan slot marked ${status}.`,
  });
}

export async function deletePlanningSlotPage(
  db: HealthDatabase,
  state: PlanningPageState,
  slotId: string
): Promise<PlanningPageState> {
  await deletePlanSlot(db, slotId);
  return await reloadPlanningPageState(db, state, {
    planNotice: 'Plan slot removed.',
  });
}

export async function movePlanningSlotPage(
  db: HealthDatabase,
  state: PlanningPageState,
  slotId: string,
  direction: 'up' | 'down'
): Promise<PlanningPageState> {
  await movePlanSlot(db, slotId, direction);
  return await reloadPlanningPageState(db, state, {
    planNotice: `Plan slot moved ${direction}.`,
  });
}

export async function togglePlanningGroceryStatePage(
  db: HealthDatabase,
  state: PlanningPageState,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<PlanningPageState> {
  await setGroceryItemState(db, itemId, patch);
  return await reloadPlanningPageState(db, state, {
    groceryNotice: 'Grocery item updated.',
  });
}
