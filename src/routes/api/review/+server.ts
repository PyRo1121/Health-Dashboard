import type { RequestHandler } from './$types';
import { loadReviewPageServer, saveReviewExperimentPageServer } from '$lib/server/review/service';
import { reviewRequestSchema } from '$lib/features/review/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: reviewRequestSchema,
  invalidMessage: 'Invalid review request payload.',
  handlers: {
    load: async (data) => await loadReviewPageServer(data.localDay),
    saveExperiment: async (data) => await saveReviewExperimentPageServer(data.state),
  },
});
