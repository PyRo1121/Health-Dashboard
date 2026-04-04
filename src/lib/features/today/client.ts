import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	beginTodaySave,
	clearTodayPlannedMealPage as clearTodayPlannedMealPageController,
	createTodayPageState,
	logTodayPlannedMealPage as logTodayPlannedMealPageController,
	loadTodayPage as loadTodayPageController,
	markTodayPlanSlotStatusPage as markTodayPlanSlotStatusPageController,
	saveTodayPage as saveTodayPageController,
	type TodayPageState
} from './controller';

export { beginTodaySave, createTodayPageState };

export async function loadTodayPage(localDay = currentLocalDay()): Promise<TodayPageState> {
	return await postFeatureRequest(
		'/api/today',
		{
			action: 'load',
			localDay
		},
		(db) => loadTodayPageController(db, localDay)
	);
}

export async function saveTodayPage(state: TodayPageState): Promise<TodayPageState> {
	return await postFeatureRequest(
		'/api/today',
		{
			action: 'save',
			state
		},
		(db) => saveTodayPageController(db, state)
	);
}

export async function logTodayPlannedMealPage(state: TodayPageState): Promise<TodayPageState> {
	return await postFeatureRequest(
		'/api/today',
		{
			action: 'logPlannedMeal',
			state
		},
		(db) => logTodayPlannedMealPageController(db, state)
	);
}

export async function clearTodayPlannedMealPage(state: TodayPageState): Promise<TodayPageState> {
	return await postFeatureRequest(
		'/api/today',
		{
			action: 'clearPlannedMeal',
			state
		},
		(db) => clearTodayPlannedMealPageController(db, state)
	);
}

export async function markTodayPlanSlotStatusPage(
	state: TodayPageState,
	slotId: string,
	status: 'planned' | 'done' | 'skipped'
): Promise<TodayPageState> {
	return await postFeatureRequest(
		'/api/today',
		{
			action: 'markPlanSlotStatus',
			state,
			slotId,
			status
		},
		(db) => markTodayPlanSlotStatusPageController(db, state, slotId, status)
	);
}
