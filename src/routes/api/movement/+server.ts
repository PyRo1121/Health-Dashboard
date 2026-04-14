import type { RequestHandler } from './$types';
import { movementRequestSchema } from '$lib/features/movement/contracts';
import { createValidatedActionPostHandler } from '$lib/server/http/validated-action-route';
import {
  loadMovementPageServer,
  saveMovementWorkoutTemplatePageServer,
} from '$lib/server/movement/service';

export const POST: RequestHandler = createValidatedActionPostHandler({
  schema: movementRequestSchema,
  invalidMessage: 'Invalid movement request payload.',
  handlers: {
    load: async () => await loadMovementPageServer(),
    saveWorkoutTemplate: async (data) => await saveMovementWorkoutTemplatePageServer(data.state),
  },
});
