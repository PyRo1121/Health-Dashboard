import { currentLocalDay } from '$lib/core/domain/time';
import { postFeatureRequest } from '$lib/core/http/feature-client';
import {
	createReviewPageState,
	loadReviewPage as loadReviewPageController,
	saveReviewExperimentPage as saveReviewExperimentPageController,
	setReviewExperiment,
	type ReviewPageState
} from './controller';

export { createReviewPageState, setReviewExperiment };

export async function loadReviewPage(localDay = currentLocalDay()): Promise<ReviewPageState> {
	return await postFeatureRequest(
		'/api/review',
		{
			action: 'load',
			localDay
		},
		(db) => loadReviewPageController(db, localDay)
	);
}

export async function saveReviewExperimentPage(state: ReviewPageState): Promise<ReviewPageState> {
	return await postFeatureRequest(
		'/api/review',
		{
			action: 'saveExperiment',
			state
		},
		(db) => saveReviewExperimentPageController(db, state)
	);
}
