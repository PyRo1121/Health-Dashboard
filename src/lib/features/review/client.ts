import { currentLocalDay } from '$lib/core/domain/time';
import { createFeatureActionClient } from '$lib/core/http/feature-client';
import {
  createReviewPageState,
  loadReviewPage as loadReviewPageController,
  saveReviewExperimentPage as saveReviewExperimentPageController,
  setReviewExperiment,
  type ReviewPageState,
} from './controller';

export { createReviewPageState, setReviewExperiment };

const reviewClient = createFeatureActionClient<Parameters<typeof loadReviewPageController>[0]>('/api/review');

export async function loadReviewPage(localDay = currentLocalDay()): Promise<ReviewPageState> {
  return await reviewClient.action('load', (db) => loadReviewPageController(db, localDay), {
    localDay,
  });
}

export async function saveReviewExperimentPage(state: ReviewPageState): Promise<ReviewPageState> {
  return await reviewClient.stateAction('saveExperiment', state, (db) =>
    saveReviewExperimentPageController(db, state)
  );
}
