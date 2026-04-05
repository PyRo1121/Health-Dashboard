import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadReviewPage,
  saveReviewExperimentPage,
  type ReviewPageState,
} from '$lib/features/review/controller';
import { reviewRequestSchema, type ReviewRequest } from '$lib/features/review/contracts';

export const POST = createDbActionPostHandler<ReviewRequest, ReviewPageState>(
  {
    load: (db, body) => loadReviewPage(db, body.localDay),
    saveExperiment: (db, body) => saveReviewExperimentPage(db, body.state),
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = reviewRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid review request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid review request payload.', { status: 400 }),
  }
);
