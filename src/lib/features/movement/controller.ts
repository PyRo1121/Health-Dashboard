import type { HealthDatabase } from '$lib/core/db/types';
import type { ExerciseCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
import {
  createWorkoutTemplateForm,
  normalizeExerciseDrafts,
  type WorkoutTemplateFormState,
} from './model';
import {
  listExerciseCatalogItems,
  listWorkoutTemplates,
  saveWorkoutTemplate,
  searchExerciseCatalog,
} from './service';
import {
  addEmptyExerciseToWorkoutTemplateState,
  addExerciseToWorkoutTemplateState,
  applyExerciseSearchResultsState,
  removeWorkoutTemplateExerciseState,
  updateExerciseSearchQueryState,
  updateWorkoutTemplateExerciseFieldState,
} from './studio-state';

export interface MovementPageState {
  loading: boolean;
  saveNotice: string;
  workoutTemplates: WorkoutTemplate[];
  exerciseCatalogItems: ExerciseCatalogItem[];
  exerciseSearchQuery: string;
  exerciseSearchResults: ExerciseCatalogItem[];
  workoutTemplateForm: WorkoutTemplateFormState;
}

export function createMovementPageState(): MovementPageState {
  return {
    loading: true,
    saveNotice: '',
    workoutTemplates: [],
    exerciseCatalogItems: [],
    exerciseSearchQuery: '',
    exerciseSearchResults: [],
    workoutTemplateForm: createWorkoutTemplateForm(),
  };
}

export async function loadMovementPage(db: HealthDatabase): Promise<MovementPageState> {
  const [workoutTemplates, exerciseCatalogItems] = await Promise.all([
    listWorkoutTemplates(db),
    listExerciseCatalogItems(db),
  ]);

  return {
    ...createMovementPageState(),
    loading: false,
    workoutTemplates,
    exerciseCatalogItems,
  };
}

async function reloadMovementPageState(
  db: HealthDatabase,
  state: MovementPageState,
  overrides: Partial<MovementPageState> = {}
): Promise<MovementPageState> {
  const next = await loadMovementPage(db);
  return {
    ...next,
    ...overrides,
  };
}

export function updateMovementExerciseSearchQuery(
  state: MovementPageState,
  exerciseSearchQuery: string
): MovementPageState {
  return updateExerciseSearchQueryState(state, exerciseSearchQuery);
}

export function applyMovementExerciseSearchResults(
  state: MovementPageState,
  results: ExerciseCatalogItem[]
): MovementPageState {
  return applyExerciseSearchResultsState(state, results);
}

export function addExerciseToWorkoutTemplate(
  state: MovementPageState,
  exercise: ExerciseCatalogItem
): MovementPageState {
  return addExerciseToWorkoutTemplateState(state, exercise);
}

export function addEmptyExerciseToWorkoutTemplate(state: MovementPageState): MovementPageState {
  return addEmptyExerciseToWorkoutTemplateState(state);
}

export function updateWorkoutTemplateExerciseField(
  state: MovementPageState,
  index: number,
  field: 'name' | 'sets' | 'reps' | 'restSeconds',
  value: string
): MovementPageState {
  return updateWorkoutTemplateExerciseFieldState(state, index, field, value);
}

export function removeWorkoutTemplateExercise(
  state: MovementPageState,
  index: number
): MovementPageState {
  return removeWorkoutTemplateExerciseState(state, index);
}

export function searchMovementExercises(state: MovementPageState): MovementPageState {
  return applyMovementExerciseSearchResults(
    state,
    searchExerciseCatalog(state.exerciseSearchQuery, state.exerciseCatalogItems)
  );
}

export async function saveMovementWorkoutTemplatePage(
  db: HealthDatabase,
  state: MovementPageState
): Promise<MovementPageState> {
  await saveWorkoutTemplate(db, {
    title: state.workoutTemplateForm.title,
    goal: state.workoutTemplateForm.goal,
    exerciseRefs: normalizeExerciseDrafts(state.workoutTemplateForm.exercises),
  });

  return await reloadMovementPageState(db, state, {
    saveNotice: 'Workout template saved.',
    workoutTemplateForm: createWorkoutTemplateForm(),
  });
}
