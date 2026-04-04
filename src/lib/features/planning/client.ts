import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
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
	type PlanningPageState
} from './controller';
import { searchExerciseCatalog } from '$lib/features/movement/service';

export { createPlanningPageState };

export async function loadPlanningPage(localDay = currentLocalDay(), state = createPlanningPageState()): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'load',
			localDay,
			state
		},
		(db) => loadPlanningPageController(db, localDay, state)
	);
}

export async function savePlanningSlotPage(state: PlanningPageState): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'saveSlot',
			state
		},
		(db) => savePlanningSlotPageController(db, state)
	);
}

export async function saveWorkoutTemplatePage(state: PlanningPageState): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'saveWorkoutTemplate',
			state
		},
		(db) => saveWorkoutTemplatePageController(db, state)
	);
}

export async function markPlanningSlotStatusPage(
	state: PlanningPageState,
	slotId: string,
	status: 'planned' | 'done' | 'skipped'
): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'markSlotStatus',
			state,
			slotId,
			status
		},
		(db) => markPlanningSlotStatusPageController(db, state, slotId, status)
	);
}

export async function deletePlanningSlotPage(
	state: PlanningPageState,
	slotId: string
): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'deleteSlot',
			state,
			slotId
		},
		(db) => deletePlanningSlotPageController(db, state, slotId)
	);
}

export async function movePlanningSlotPage(
	state: PlanningPageState,
	slotId: string,
	direction: 'up' | 'down'
): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'moveSlot',
			state,
			slotId,
			direction
		},
		(db) => movePlanningSlotPageController(db, state, slotId, direction)
	);
}

export async function togglePlanningGroceryStatePage(
	state: PlanningPageState,
	itemId: string,
	patch: { checked: boolean; excluded: boolean; onHand: boolean }
): Promise<PlanningPageState> {
	return await postFeatureRequest(
		'/api/plan',
		{
			action: 'toggleGrocery',
			state,
			itemId,
			patch
		},
		(db) => togglePlanningGroceryStatePageController(db, state, itemId, patch)
	);
}

export {
	addEmptyExerciseToWorkoutTemplate,
	addExerciseToWorkoutTemplate,
	removeWorkoutTemplateExercise,
	updateWorkoutTemplateExerciseField,
	updateExerciseSearchQuery
};

export async function searchPlanningExercises(state: PlanningPageState): Promise<PlanningPageState> {
	const results = await postFeatureRequest(
		'/api/movement/search-exercises',
		{
			query: state.exerciseSearchQuery
		},
		async () => searchExerciseCatalog(state.exerciseSearchQuery, state.exerciseCatalogItems)
	);

	return applyExerciseSearchResults(state, results);
}
