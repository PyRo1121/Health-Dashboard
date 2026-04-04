import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	createAssessmentsPageState,
	loadAssessmentsPage as loadAssessmentsPageController,
	saveAssessmentsProgressPage as saveAssessmentsProgressPageController,
	setAssessmentsInstrument,
	submitAssessmentsPage as submitAssessmentsPageController,
	type AssessmentsPageState
} from './controller';

export { createAssessmentsPageState, setAssessmentsInstrument };

export async function loadAssessmentsPage(
	state: AssessmentsPageState,
	localDay = currentLocalDay()
): Promise<AssessmentsPageState> {
	return await postFeatureRequest(
		'/api/assessments',
		{
			action: 'load',
			localDay,
			state
		},
		(db) => loadAssessmentsPageController(db, localDay, state)
	);
}

export async function saveAssessmentsProgressPage(
	state: AssessmentsPageState
): Promise<AssessmentsPageState> {
	return await postFeatureRequest(
		'/api/assessments',
		{
			action: 'saveProgress',
			state
		},
		(db) => saveAssessmentsProgressPageController(db, state)
	);
}

export async function submitAssessmentsPage(state: AssessmentsPageState): Promise<AssessmentsPageState> {
	return await postFeatureRequest(
		'/api/assessments',
		{
			action: 'submit',
			state
		},
		(db) => submitAssessmentsPageController(db, state)
	);
}
