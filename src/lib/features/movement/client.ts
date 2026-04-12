import {
  createFeatureActionClient,
  createFeatureRequestClient,
} from '$lib/core/http/feature-client';
import {
  addEmptyExerciseToWorkoutTemplate,
  addExerciseToWorkoutTemplate,
  applyMovementExerciseSearchResults,
  createMovementPageState,
  loadMovementPage as loadMovementPageController,
  removeWorkoutTemplateExercise,
  saveMovementWorkoutTemplatePage as saveMovementWorkoutTemplatePageController,
  searchMovementExercises as searchMovementExercisesController,
  updateMovementExerciseSearchQuery,
  updateWorkoutTemplateExerciseField,
  type MovementPageState,
} from './controller';
import { searchExerciseCatalog } from './service';

export {
  addEmptyExerciseToWorkoutTemplate,
  addExerciseToWorkoutTemplate,
  createMovementPageState,
  removeWorkoutTemplateExercise,
  updateMovementExerciseSearchQuery,
  updateWorkoutTemplateExerciseField,
};

const movementClient = createFeatureActionClient<Parameters<typeof loadMovementPageController>[0]>('/api/movement');
const movementSearchClient = createFeatureRequestClient<never>('/api/movement/search-exercises');

export async function loadMovementPage(): Promise<MovementPageState> {
  return await movementClient.action('load', (db) => loadMovementPageController(db));
}

export async function saveMovementWorkoutTemplatePage(
  state: MovementPageState
): Promise<MovementPageState> {
  return await movementClient.stateAction('saveWorkoutTemplate', state, (db) =>
    saveMovementWorkoutTemplatePageController(db, state)
  );
}

export async function searchMovementExercises(
  state: MovementPageState
): Promise<MovementPageState> {
  const results = await movementSearchClient.request(
    { query: state.exerciseSearchQuery },
    async () => searchExerciseCatalog(state.exerciseSearchQuery, state.exerciseCatalogItems)
  );

  return applyMovementExerciseSearchResults(searchMovementExercisesController(state), results);
}
