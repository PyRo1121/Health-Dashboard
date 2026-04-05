import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadMovementPage,
  saveMovementWorkoutTemplatePage,
  type MovementPageState,
} from '$lib/features/movement/controller';
import { movementRequestSchema, type MovementRequest } from '$lib/features/movement/contracts';

export const POST = createDbActionPostHandler<MovementRequest, MovementPageState>(
  {
    load: (db) => loadMovementPage(db),
    saveWorkoutTemplate: (db, body) => saveMovementWorkoutTemplatePage(db, body.state),
  },
  undefined,
  {
    parseBody: async (request) => {
      const parsed = movementRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        throw new Error('Invalid movement request payload.');
      }
      return parsed.data;
    },
    onParseError: () => new Response('Invalid movement request payload.', { status: 400 }),
  }
);
