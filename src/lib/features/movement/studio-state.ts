import type { ExerciseCatalogItem, WorkoutTemplateExerciseRef } from '$lib/core/domain/types';
import {
  addExerciseDraft,
  type WorkoutTemplateFormState,
  removeExerciseDraft,
  updateExerciseDraftField,
} from './model';

export type WithExerciseSearchQuery = {
  exerciseSearchQuery: string;
};

export type WithExerciseSearchResults = {
  exerciseSearchResults: ExerciseCatalogItem[];
};

export type WithWorkoutTemplateForm = {
  workoutTemplateForm: WorkoutTemplateFormState;
};

export function updateWorkoutTemplateMetaState<State extends WithWorkoutTemplateForm>(
  state: State,
  field: 'title' | 'goal',
  value: string
): State {
  return {
    ...state,
    workoutTemplateForm: {
      ...state.workoutTemplateForm,
      [field]: value,
    },
  };
}

export function updateExerciseSearchQueryState<State extends WithExerciseSearchQuery>(
  state: State,
  exerciseSearchQuery: string
): State {
  return {
    ...state,
    exerciseSearchQuery,
  };
}

export function applyExerciseSearchResultsState<State extends WithExerciseSearchResults>(
  state: State,
  results: ExerciseCatalogItem[]
): State {
  return {
    ...state,
    exerciseSearchResults: results,
  };
}

export function addExerciseToWorkoutTemplateState<State extends WithWorkoutTemplateForm>(
  state: State,
  exercise: ExerciseCatalogItem
): State {
  return {
    ...state,
    workoutTemplateForm: {
      ...state.workoutTemplateForm,
      exercises: addExerciseDraft(state.workoutTemplateForm.exercises, exercise),
    },
  };
}

export function addExerciseSearchResultToWorkoutTemplateState<
  State extends WithExerciseSearchResults & WithWorkoutTemplateForm,
>(state: State, exerciseId: string): State {
  const exercise = state.exerciseSearchResults.find((item) => item.id === exerciseId);
  if (!exercise) {
    return state;
  }

  return addExerciseToWorkoutTemplateState(state, exercise);
}

export function addEmptyExerciseToWorkoutTemplateState<State extends WithWorkoutTemplateForm>(
  state: State
): State {
  return {
    ...state,
    workoutTemplateForm: {
      ...state.workoutTemplateForm,
      exercises: addExerciseDraft(state.workoutTemplateForm.exercises),
    },
  };
}

export function updateWorkoutTemplateExerciseFieldState<State extends WithWorkoutTemplateForm>(
  state: State,
  index: number,
  field: keyof WorkoutTemplateExerciseRef,
  value: string
): State {
  return {
    ...state,
    workoutTemplateForm: {
      ...state.workoutTemplateForm,
      exercises: updateExerciseDraftField(state.workoutTemplateForm.exercises, index, field, value),
    },
  };
}

export function removeWorkoutTemplateExerciseState<State extends WithWorkoutTemplateForm>(
  state: State,
  index: number
): State {
  return {
    ...state,
    workoutTemplateForm: {
      ...state.workoutTemplateForm,
      exercises: removeExerciseDraft(state.workoutTemplateForm.exercises, index),
    },
  };
}
