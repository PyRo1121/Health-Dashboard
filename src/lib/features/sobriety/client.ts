import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	createSobrietyPageState,
	loadSobrietyPage as loadSobrietyPageController,
	markSobrietyStatus as markSobrietyStatusController,
	saveSobrietyCraving as saveSobrietyCravingController,
	saveSobrietyLapse as saveSobrietyLapseController,
	type SobrietyPageState
} from './controller';

export { createSobrietyPageState };

export async function loadSobrietyPage(
	state: SobrietyPageState,
	localDay = currentLocalDay()
): Promise<SobrietyPageState> {
	return await postFeatureRequest(
		'/api/sobriety',
		{
			action: 'load',
			localDay,
			state
		},
		(db) => loadSobrietyPageController(db, localDay, state)
	);
}

export async function markSobrietyStatus(
	state: SobrietyPageState,
	status: 'sober' | 'recovery',
	notice: string
): Promise<SobrietyPageState> {
	return await postFeatureRequest(
		'/api/sobriety',
		{
			action: 'markStatus',
			state,
			status,
			notice
		},
		(db) => markSobrietyStatusController(db, state, status, notice)
	);
}

export async function saveSobrietyCraving(state: SobrietyPageState): Promise<SobrietyPageState> {
	return await postFeatureRequest(
		'/api/sobriety',
		{
			action: 'saveCraving',
			state
		},
		(db) => saveSobrietyCravingController(db, state)
	);
}

export async function saveSobrietyLapse(state: SobrietyPageState): Promise<SobrietyPageState> {
	return await postFeatureRequest(
		'/api/sobriety',
		{
			action: 'saveLapse',
			state
		},
		(db) => saveSobrietyLapseController(db, state)
	);
}
