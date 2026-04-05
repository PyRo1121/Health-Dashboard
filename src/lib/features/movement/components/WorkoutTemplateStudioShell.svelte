<script lang="ts">
  import type { ExerciseCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
  import type { WorkoutTemplateFormState } from '$lib/features/movement/model';
  import WorkoutTemplateStudio from './WorkoutTemplateStudio.svelte';
  import {
    addEmptyExerciseToWorkoutTemplateState,
    addExerciseSearchResultToWorkoutTemplateState,
    removeWorkoutTemplateExerciseState,
    updateExerciseSearchQueryState,
    updateWorkoutTemplateExerciseFieldState,
    updateWorkoutTemplateMetaState,
  } from '$lib/features/movement/studio-state';

  type WorkoutTemplateStudioShellState = {
    workoutTemplateForm: WorkoutTemplateFormState;
    exerciseSearchQuery: string;
    exerciseSearchResults: ExerciseCatalogItem[];
    workoutTemplates: WorkoutTemplate[];
  };

  let {
    page,
    title,
    saveNotice,
    emptyStateTitle,
    emptyStateMessage,
    onPageChange,
    onSearchExercises,
    onSaveTemplate,
  }: {
    page: WorkoutTemplateStudioShellState;
    title: string;
    saveNotice: string;
    emptyStateTitle: string;
    emptyStateMessage: string;
    onPageChange: (nextPage: WorkoutTemplateStudioShellState) => void;
    onSearchExercises: (
      page: WorkoutTemplateStudioShellState
    ) => Promise<WorkoutTemplateStudioShellState>;
    onSaveTemplate: (
      page: WorkoutTemplateStudioShellState
    ) => Promise<WorkoutTemplateStudioShellState>;
  } = $props();

  function updatePage(nextPage: WorkoutTemplateStudioShellState) {
    onPageChange(nextPage);
  }

  async function searchExercises() {
    updatePage(await onSearchExercises(page));
  }

  async function saveTemplate() {
    updatePage(await onSaveTemplate(page));
  }
</script>

<WorkoutTemplateStudio
  {title}
  workoutTemplateForm={page.workoutTemplateForm}
  exerciseSearchQuery={page.exerciseSearchQuery}
  exerciseSearchResults={page.exerciseSearchResults}
  workoutTemplates={page.workoutTemplates}
  {saveNotice}
  {emptyStateTitle}
  {emptyStateMessage}
  onUpdateWorkoutTemplateMeta={(field, value) =>
    updatePage(updateWorkoutTemplateMetaState(page, field, value))}
  onSearchQueryChange={(value) => updatePage(updateExerciseSearchQueryState(page, value))}
  onSearchExercises={searchExercises}
  onSaveTemplate={saveTemplate}
  onAddExercise={(exerciseId) =>
    updatePage(addExerciseSearchResultToWorkoutTemplateState(page, exerciseId))}
  onAddExerciseRow={() => updatePage(addEmptyExerciseToWorkoutTemplateState(page))}
  onUpdateExerciseField={(index, field, value) =>
    updatePage(updateWorkoutTemplateExerciseFieldState(page, index, field, value))}
  onRemoveExerciseRow={(index) => updatePage(removeWorkoutTemplateExerciseState(page, index))}
/>
