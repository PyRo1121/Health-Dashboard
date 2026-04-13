import type { RequestHandler } from './$types';
import { assessmentsRequestSchema } from '$lib/features/assessments/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  loadAssessmentsPageServer,
  saveAssessmentsProgressPageServer,
  submitAssessmentsPageServer,
} from '$lib/server/assessments/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: assessmentsRequestSchema,
  invalidMessage: 'Invalid assessments request payload.',
  handlers: {
    load: async (data) => await loadAssessmentsPageServer(data.localDay, data.state),
    saveProgress: async (data) => await saveAssessmentsProgressPageServer(data.state),
    submit: async (data) => await submitAssessmentsPageServer(data.state),
  },
});
