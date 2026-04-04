import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	createHealthPageState,
	loadHealthPage as loadHealthPageController,
	quickLogTemplatePage as quickLogTemplatePageController,
	saveAnxietyPage as saveAnxietyPageController,
	saveSleepNotePage as saveSleepNotePageController,
	saveSymptomPage as saveSymptomPageController,
	saveTemplatePage as saveTemplatePageController,
	type HealthPageState
} from './controller';

export { createHealthPageState };

export async function loadHealthPage(localDay = currentLocalDay()): Promise<HealthPageState> {
	return await postFeatureRequest(
		'/api/health',
		{
			action: 'load',
			localDay
		},
		(db) => loadHealthPageController(db, localDay)
	);
}

export async function saveSymptomPage(state: HealthPageState): Promise<HealthPageState> {
	return await postFeatureRequest(
		'/api/health',
		{
			action: 'saveSymptom',
			state
		},
		(db) => saveSymptomPageController(db, state)
	);
}

export async function saveAnxietyPage(state: HealthPageState): Promise<HealthPageState> {
	return await postFeatureRequest(
		'/api/health',
		{
			action: 'saveAnxiety',
			state
		},
		(db) => saveAnxietyPageController(db, state)
	);
}

export async function saveSleepNotePage(state: HealthPageState): Promise<HealthPageState> {
	return await postFeatureRequest(
		'/api/health',
		{
			action: 'saveSleepNote',
			state
		},
		(db) => saveSleepNotePageController(db, state)
	);
}

export async function saveTemplatePage(state: HealthPageState): Promise<HealthPageState> {
	return await postFeatureRequest(
		'/api/health',
		{
			action: 'saveTemplate',
			state
		},
		(db) => saveTemplatePageController(db, state)
	);
}

export async function quickLogTemplatePage(
	state: HealthPageState,
	templateId: string
): Promise<HealthPageState> {
	return await postFeatureRequest(
		'/api/health',
		{
			action: 'quickLogTemplate',
			state,
			templateId
		},
		(db) => quickLogTemplatePageController(db, state, templateId)
	);
}
