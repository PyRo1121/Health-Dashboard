import type { GroceryItem, PlanSlot } from '$lib/core/domain/types';
import { createWorkoutTemplateForm, normalizeExerciseDrafts } from '$lib/features/movement/model';
import { createPlanningSlotForm } from '$lib/features/planning/model';
import { buildWeeklyPlanSnapshotFromData } from '$lib/features/planning/service';
import { createPlanningPageState, type PlanningPageState } from '$lib/features/planning/state';
import { refreshWeeklyReviewArtifactsServer } from '$lib/server/review/service';
import {
  deletePlanSlotServer,
  ensureWeeklyPlanServer,
  listExerciseCatalogItemsServer,
  listFoodCatalogItemsServer,
  listRecipeCatalogItemsServer,
  listWeeklyPlanSlotsServer,
  listWorkoutTemplatesServer,
  movePlanSlotServer,
  savePlanSlotServer,
  saveWorkoutTemplateServer,
  updatePlanSlotServer,
} from '$lib/server/planning/store';
import {
  removeManualGroceryItemServer,
  saveManualGroceryItemServer,
  setGroceryItemStateServer,
  syncDerivedGroceriesServer,
} from '$lib/server/groceries/store';

function createLoadedPlanningPageState(
  state: PlanningPageState,
  localDay: string,
  snapshot: ReturnType<typeof buildWeeklyPlanSnapshotFromData>,
  overrides: Partial<PlanningPageState> = {}
): PlanningPageState {
  return {
    ...state,
    planNotice: '',
    workoutTemplateNotice: '',
    groceryNotice: '',
    loading: false,
    localDay,
    weeklyPlan: snapshot.weeklyPlan,
    weekDays: snapshot.weekDays,
    slots: snapshot.slots,
    groceryItems: snapshot.groceryItems,
    groceryWarnings: snapshot.groceryWarnings,
    exerciseCatalogItems: snapshot.exerciseCatalogItems,
    foodCatalogItems: snapshot.foodCatalogItems,
    recipeCatalogItems: snapshot.recipeCatalogItems,
    workoutTemplates: snapshot.workoutTemplates,
    slotForm: state.slotForm.localDay
      ? { ...state.slotForm, localDay: state.slotForm.localDay }
      : createPlanningSlotForm(localDay),
    ...overrides,
  };
}

async function buildPlanningSnapshotServer(localDay: string) {
  const weeklyPlan = await ensureWeeklyPlanServer(localDay);
  const [slots, foodCatalogItems, recipeCatalogItems, workoutTemplates, exerciseCatalogItems] =
    await Promise.all([
      listWeeklyPlanSlotsServer(weeklyPlan.id),
      listFoodCatalogItemsServer(),
      listRecipeCatalogItemsServer(),
      listWorkoutTemplatesServer(),
      listExerciseCatalogItemsServer(),
    ]);
  const groceryResult = await syncDerivedGroceriesServer(weeklyPlan.id, slots);

  return buildWeeklyPlanSnapshotFromData({
    weeklyPlan,
    slots,
    groceryItems: groceryResult.items,
    groceryWarnings: groceryResult.warnings,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
  });
}

async function reloadPlanningPageStateServer(
  state: PlanningPageState,
  overrides: Partial<PlanningPageState> = {}
): Promise<PlanningPageState> {
  return createLoadedPlanningPageState(
    state,
    state.localDay,
    await buildPlanningSnapshotServer(state.localDay),
    overrides
  );
}

async function refreshPlanningPageAfterMutationServer(
  state: PlanningPageState,
  notice: Partial<
    Pick<
      PlanningPageState,
      'planNotice' | 'workoutTemplateNotice' | 'groceryNotice' | 'slotForm' | 'workoutTemplateForm'
    >
  >
): Promise<PlanningPageState> {
  await refreshWeeklyReviewArtifactsServer(state.localDay);
  return await reloadPlanningPageStateServer(state, notice);
}

export async function loadPlanningPageServer(
  localDay: string,
  state: PlanningPageState = createPlanningPageState()
): Promise<PlanningPageState> {
  return createLoadedPlanningPageState(
    state,
    localDay,
    await buildPlanningSnapshotServer(localDay)
  );
}

export async function savePlanningSlotPageServer(
  state: PlanningPageState
): Promise<PlanningPageState> {
  if (!state.weeklyPlan) {
    return state;
  }

  const slotType = state.slotForm.slotType;
  if (slotType === 'meal') {
    if (state.slotForm.mealSource === 'recipe' && !state.slotForm.recipeId) {
      return { ...state, planNotice: 'Choose a recipe before adding a meal slot.' };
    }
    if (state.slotForm.mealSource === 'food' && !state.slotForm.foodCatalogItemId) {
      return { ...state, planNotice: 'Choose a saved food before adding a meal slot.' };
    }
  }

  if (slotType === 'workout' && !state.slotForm.workoutTemplateId) {
    return { ...state, planNotice: 'Choose a workout template before adding a workout slot.' };
  }

  const [recipes, foods, workoutTemplates] = await Promise.all([
    listRecipeCatalogItemsServer(),
    listFoodCatalogItemsServer(),
    listWorkoutTemplatesServer(),
  ]);

  let title = state.slotForm.title.trim();
  let itemType: PlanSlot['itemType'] = 'freeform';
  let itemId: string | undefined;

  if (slotType === 'meal') {
    if (state.slotForm.mealSource === 'recipe') {
      const recipe = recipes.find((candidate) => candidate.id === state.slotForm.recipeId);
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
      const food = foods.find((candidate) => candidate.id === state.slotForm.foodCatalogItemId);
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
    const template = workoutTemplates.find(
      (candidate) => candidate.id === state.slotForm.workoutTemplateId
    );
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

  await savePlanSlotServer({
    weeklyPlanId: state.weeklyPlan.id,
    localDay: state.slotForm.localDay,
    slotType,
    itemType,
    itemId,
    title,
    notes: state.slotForm.notes,
  });

  return await refreshPlanningPageAfterMutationServer(state, {
    planNotice: 'Plan slot saved.',
    slotForm: createPlanningSlotForm(state.slotForm.localDay),
  });
}

export async function saveWorkoutTemplatePageServer(
  state: PlanningPageState
): Promise<PlanningPageState> {
  await saveWorkoutTemplateServer({
    title: state.workoutTemplateForm.title,
    goal: state.workoutTemplateForm.goal,
    exerciseRefs: normalizeExerciseDrafts(state.workoutTemplateForm.exercises),
  });

  return await refreshPlanningPageAfterMutationServer(state, {
    workoutTemplateNotice: 'Workout template saved.',
    workoutTemplateForm: createWorkoutTemplateForm(),
  });
}

export async function markPlanningSlotStatusPageServer(
  state: PlanningPageState,
  slotId: string,
  status: PlanSlot['status']
): Promise<PlanningPageState> {
  await updatePlanSlotServer(slotId, { status });
  return await refreshPlanningPageAfterMutationServer(state, {
    planNotice: `Plan slot marked ${status}.`,
  });
}

export async function movePlanningSlotPageServer(
  state: PlanningPageState,
  slotId: string,
  direction: 'up' | 'down'
): Promise<PlanningPageState> {
  await movePlanSlotServer(slotId, direction);
  return await refreshPlanningPageAfterMutationServer(state, {
    planNotice: `Plan slot moved ${direction}.`,
  });
}

export async function deletePlanningSlotPageServer(
  state: PlanningPageState,
  slotId: string
): Promise<PlanningPageState> {
  await deletePlanSlotServer(slotId);
  return await refreshPlanningPageAfterMutationServer(state, {
    planNotice: 'Plan slot removed.',
  });
}

export async function togglePlanningGroceryStatePageServer(
  state: PlanningPageState,
  itemId: string,
  patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
): Promise<PlanningPageState> {
  await setGroceryItemStateServer(itemId, patch);
  return await refreshPlanningPageAfterMutationServer(state, {
    groceryNotice: 'Grocery item updated.',
  });
}

export async function addManualPlanningGroceryItemPageServer(
  state: PlanningPageState,
  draft: { label: string; quantityText: string }
): Promise<PlanningPageState> {
  if (!state.weeklyPlan) {
    return state;
  }

  if (!draft.label.trim()) {
    return { ...state, groceryNotice: 'Manual grocery label is required.' };
  }

  await saveManualGroceryItemServer(
    state.weeklyPlan.id,
    [draft.quantityText.trim(), draft.label.trim()].filter(Boolean).join(' ')
  );

  return await refreshPlanningPageAfterMutationServer(state, {
    groceryNotice: 'Manual grocery item added.',
  });
}

export async function removeManualPlanningGroceryItemPageServer(
  state: PlanningPageState,
  itemId: string
): Promise<PlanningPageState> {
  await removeManualGroceryItemServer(itemId);
  return await refreshPlanningPageAfterMutationServer(state, {
    groceryNotice: 'Manual grocery item removed.',
  });
}
