import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadReviewPage,
  saveReviewExperimentPage,
  type ReviewPageState,
} from '$lib/features/review/controller';

type ReviewRequest =
  | { action: 'load'; localDay: string }
  | { action: 'saveExperiment'; state: ReviewPageState };

export const POST = createDbActionPostHandler<ReviewRequest, ReviewPageState>({
  load: (db, body) => loadReviewPage(db, body.localDay),
  saveExperiment: (db, body) => saveReviewExperimentPage(db, body.state),
});
