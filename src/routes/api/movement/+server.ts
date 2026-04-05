import { createDbActionPostHandler } from '$lib/server/http/action-route';
import {
  loadMovementPage,
  saveMovementWorkoutTemplatePage,
  type MovementPageState,
} from '$lib/features/movement/controller';

type MovementRequest =
  | { action: 'load' }
  | { action: 'saveWorkoutTemplate'; state: MovementPageState };

export const POST = createDbActionPostHandler<MovementRequest, MovementPageState>({
  load: (db) => loadMovementPage(db),
  saveWorkoutTemplate: (db, body) => saveMovementWorkoutTemplatePage(db, body.state),
});
