import { currentLocalDay } from '$lib/core/domain/time';
import {
  createFeatureActionClient,
  createFeatureRequestClient,
} from '$lib/core/http/feature-client';
import {
  addEmptyExerciseToWorkoutTemplate,
  addExerciseToWorkoutTemplate,
  applyExerciseSearchResults,
  createPlanningPageState,
  deletePlanningSlotPage as deletePlanningSlotPageController,
  loadPlanningPage as loadPlanningPageController,
  markPlanningSlotStatusPage as markPlanningSlotStatusPageController,
  movePlanningSlotPage as movePlanningSlotPageController,
  removeWorkoutTemplateExercise,
  savePlanningSlotPage as savePlanningSlotPageController,
  saveWorkoutTemplatePage as saveWorkoutTemplatePageController,
  togglePlanningGroceryStatePage as togglePlanningGroceryStatePageController,
  updateWorkoutTemplateExerciseField,
  updateExerciseSearchQuery,
  type PlanningPageState,
} from './controller';
import { searchExerciseCatalog } from '$lib/features/movement/service';

export { createPlanningPageState };

const planningClient = createFeatureActionClient('/api/plan');
const movementSearchClient = createFeatureRequestClient('/api/movement/search-exercises');

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
