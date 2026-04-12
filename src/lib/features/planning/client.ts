import { currentLocalDay } from '$lib/core/domain/time';
import { createGroceryDraftState } from '$lib/features/groceries/controller';
import {
  createFeatureActionClient,
  createFeatureRequestClient,
} from '$lib/core/http/feature-client';
import {
  addManualPlanningGroceryItemPage as addManualPlanningGroceryItemPageController,
  deletePlanningSlotPage as deletePlanningSlotPageController,
  markPlanningSlotStatusPage as markPlanningSlotStatusPageController,
  movePlanningSlotPage as movePlanningSlotPageController,
  removeManualPlanningGroceryItemPage as removeManualPlanningGroceryItemPageController,
  savePlanningSlotPage as savePlanningSlotPageController,
  saveWorkoutTemplatePage as saveWorkoutTemplatePageController,
  togglePlanningGroceryStatePage as togglePlanningGroceryStatePageController,
} from './actions';
import {
  addEmptyExerciseToWorkoutTemplate,
  addExerciseToWorkoutTemplate,
  applyExerciseSearchResults,
  createPlanningPageState,
  loadPlanningPage as loadPlanningPageController,
  removeWorkoutTemplateExercise,
  updateWorkoutTemplateExerciseField,
  updateExerciseSearchQuery,
  type PlanningPageState,
} from './state';
import { searchExerciseCatalog } from '$lib/features/movement/service';

export { createGroceryDraftState, createPlanningPageState };

const planningClient = createFeatureActionClient<Parameters<typeof savePlanningSlotPageController>[0]>('/api/plan');
const movementSearchClient = createFeatureRequestClient<never>('/api/movement/search-exercises');

export async function loadPlanningPage(
  localDay = currentLocalDay(),
  state = createPlanningPageState()
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'load',
    state,
    (db) => loadPlanningPageController(db, localDay, state),
    { localDay }
  );
}

export async function savePlanningSlotPage(state: PlanningPageState): Promise<PlanningPageState> {
  return await planningClient.stateAction('saveSlot', state, (db) =>
    savePlanningSlotPageController(db, state)
  );
}

export async function saveWorkoutTemplatePage(
  state: PlanningPageState
): Promise<PlanningPageState> {
  return await planningClient.stateAction('saveWorkoutTemplate', state, (db) =>
    saveWorkoutTemplatePageController(db, state)
  );
}

export async function markPlanningSlotStatusPage(
  state: PlanningPageState,
  slotId: string,
  status: 'planned' | 'done' | 'skipped'
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'markSlotStatus',
    state,
    (db) => markPlanningSlotStatusPageController(db, state, slotId, status),
    { slotId, status }
  );
}

export async function deletePlanningSlotPage(
  state: PlanningPageState,
  slotId: string
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'deleteSlot',
    state,
    (db) => deletePlanningSlotPageController(db, state, slotId),
    { slotId }
  );
}

export async function movePlanningSlotPage(
  state: PlanningPageState,
  slotId: string,
  direction: 'up' | 'down'
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'moveSlot',
    state,
    (db) => movePlanningSlotPageController(db, state, slotId, direction),
    { slotId, direction }
  );
}

export async function togglePlanningGroceryStatePage(
  state: PlanningPageState,
  itemId: string,
  patch: { checked: boolean; excluded: boolean; onHand: boolean }
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'toggleGrocery',
    state,
    (db) => togglePlanningGroceryStatePageController(db, state, itemId, patch),
    { itemId, patch }
  );
}

export async function addManualPlanningGroceryItemPage(
  state: PlanningPageState,
  draft: { label: string; quantityText: string }
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'addManualGrocery',
    state,
    (db) => addManualPlanningGroceryItemPageController(db, state, draft),
    { draft }
  );
}

export async function removeManualPlanningGroceryItemPage(
  state: PlanningPageState,
  itemId: string
): Promise<PlanningPageState> {
  return await planningClient.stateAction(
    'removeManualGrocery',
    state,
    (db) => removeManualPlanningGroceryItemPageController(db, state, itemId),
    { itemId }
  );
}

export {
  addEmptyExerciseToWorkoutTemplate,
  addExerciseToWorkoutTemplate,
  removeWorkoutTemplateExercise,
  updateWorkoutTemplateExerciseField,
  updateExerciseSearchQuery,
};

export async function searchPlanningExercises(
  state: PlanningPageState
): Promise<PlanningPageState> {
  const results = await movementSearchClient.request(
    { query: state.exerciseSearchQuery },
    async () => searchExerciseCatalog(state.exerciseSearchQuery, state.exerciseCatalogItems)
  );

  return applyExerciseSearchResults(state, results);
}
