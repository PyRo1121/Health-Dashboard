import type { GroceryItem, PlanSlot } from '$lib/core/domain/types';
import {
  removeManualGroceryItem,
  saveManualGroceryItem,
  setGroceryItemState,
} from '$lib/features/groceries/service';
import { createWorkoutTemplateForm, normalizeExerciseDrafts } from '$lib/features/movement/model';
import { saveWorkoutTemplate } from '$lib/features/movement/service';
import {
  refreshWeeklyReviewArtifactsSafely,
  type ReviewStorage,
} from '$lib/features/review/service';
import {
  deletePlanSlot,
  movePlanSlot,
  savePlanSlot,
  updatePlanSlotStatus,
  type PlanningStorage,
} from './service';
import { createPlanningSlotForm } from './model';
import { type PlanningPageState, reloadPlanningPageState } from './state';

export interface PlanningActionsStorage extends PlanningStorage, ReviewStorage {}

async function refreshPlanningPageAfterMutation(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  notice: Partial<
    Pick<
      PlanningPageState,
      'planNotice' | 'workoutTemplateNotice' | 'groceryNotice' | 'slotForm' | 'workoutTemplateForm'
    >
  >
): Promise<PlanningPageState> {
  await refreshWeeklyReviewArtifactsSafely(store, state.localDay);
  return await reloadPlanningPageState(store, state, notice);
}

export async function savePlanningSlotPage(
  store: PlanningActionsStorage,
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
      const recipe = await store.recipeCatalogItems.get(state.slotForm.recipeId);
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
      const food = await store.foodCatalogItems.get(state.slotForm.foodCatalogItemId);
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
    const template = await store.workoutTemplates.get(state.slotForm.workoutTemplateId);
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

  await savePlanSlot(store, {
    weeklyPlanId: state.weeklyPlan.id,
    localDay: state.slotForm.localDay,
    slotType,
    itemType,
    itemId,
    title,
    notes: state.slotForm.notes,
  });
  return await refreshPlanningPageAfterMutation(store, state, {
    planNotice: 'Plan slot saved.',
    slotForm: createPlanningSlotForm(state.slotForm.localDay),
  });
}

export async function saveWorkoutTemplatePage(
  store: PlanningActionsStorage,
  state: PlanningPageState
): Promise<PlanningPageState> {
  const exerciseRefs = normalizeExerciseDrafts(state.workoutTemplateForm.exercises);
  await saveWorkoutTemplate(store, {
    title: state.workoutTemplateForm.title,
    goal: state.workoutTemplateForm.goal,
    exerciseRefs,
  });

  return await refreshPlanningPageAfterMutation(store, state, {
    workoutTemplateNotice: 'Workout template saved.',
    workoutTemplateForm: createWorkoutTemplateForm(),
  });
}

export async function markPlanningSlotStatusPage(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  slotId: string,
  status: PlanSlot['status']
): Promise<PlanningPageState> {
  await updatePlanSlotStatus(store, slotId, status);
  return await refreshPlanningPageAfterMutation(store, state, {
    planNotice: `Plan slot marked ${status}.`,
  });
}

export async function deletePlanningSlotPage(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  slotId: string
): Promise<PlanningPageState> {
  await deletePlanSlot(store, slotId);
  return await refreshPlanningPageAfterMutation(store, state, {
    planNotice: 'Plan slot removed.',
  });
}

export async function movePlanningSlotPage(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  slotId: string,
  direction: 'up' | 'down'
): Promise<PlanningPageState> {
  await movePlanSlot(store, slotId, direction);
  return await refreshPlanningPageAfterMutation(store, state, {
    planNotice: `Plan slot moved ${direction}.`,
  });
}

export async function togglePlanningGroceryStatePage(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<PlanningPageState> {
  await setGroceryItemState(store, itemId, patch);
  return await refreshPlanningPageAfterMutation(store, state, {
    groceryNotice: 'Grocery item updated.',
  });
}

export async function addManualPlanningGroceryItemPage(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  draft: { label: string; quantityText: string }
): Promise<PlanningPageState> {
  if (!state.weeklyPlan) {
    return state;
  }

  if (!draft.label.trim()) {
    return {
      ...state,
      groceryNotice: 'Manual grocery label is required.',
    };
  }

  await saveManualGroceryItem(store, state.weeklyPlan.id, {
    rawLabel: [draft.quantityText.trim(), draft.label.trim()].filter(Boolean).join(' '),
  });
  return await refreshPlanningPageAfterMutation(store, state, {
    groceryNotice: 'Manual grocery item added.',
  });
}

export async function removeManualPlanningGroceryItemPage(
  store: PlanningActionsStorage,
  state: PlanningPageState,
  itemId: string
): Promise<PlanningPageState> {
  await removeManualGroceryItem(store, itemId);
  return await refreshPlanningPageAfterMutation(store, state, {
    groceryNotice: 'Manual grocery item removed.',
  });
}
