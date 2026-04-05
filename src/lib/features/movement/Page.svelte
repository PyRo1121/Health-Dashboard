<script lang="ts">
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import WorkoutTemplateStudio from '$lib/features/movement/components/WorkoutTemplateStudio.svelte';
  import {
    addEmptyExerciseToWorkoutTemplate,
    addExerciseToWorkoutTemplate,
    createMovementPageState,
    loadMovementPage,
    removeWorkoutTemplateExercise,
    saveMovementWorkoutTemplatePage,
    searchMovementExercises,
    updateMovementExerciseSearchQuery,
    updateWorkoutTemplateExerciseField,
  } from './client';

  let page = $state(createMovementPageState());

  async function refreshData() {
    page = await loadMovementPage();
  }

  async function searchExercises() {
    page = await searchMovementExercises(page);
  }

  async function saveTemplate() {
    page = await saveMovementWorkoutTemplatePage(page);
  }

  function addExercise(exerciseId: string) {
    const exercise = page.exerciseSearchResults.find((item) => item.id === exerciseId);
    if (!exercise) return;
    page = addExerciseToWorkoutTemplate(page, exercise);
  }

  function addExerciseRow() {
    page = addEmptyExerciseToWorkoutTemplate(page);
  }

  function updateExerciseField(
    index: number,
    field: 'name' | 'sets' | 'reps' | 'restSeconds',
    value: string
  ) {
    page = updateWorkoutTemplateExerciseField(page, index, field, value);
  }

  function removeExerciseRow(index: number) {
    page = removeWorkoutTemplateExercise(page, index);
  }

  onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/movement" />

{#if page.loading}
  <p class="status-copy">Loading movement…</p>
{:else}
  <div class="page-grid movement-grid">
    <WorkoutTemplateStudio
      title="Build workout templates"
      workoutTemplateForm={page.workoutTemplateForm}
      exerciseSearchQuery={page.exerciseSearchQuery}
      exerciseSearchResults={page.exerciseSearchResults}
      workoutTemplates={page.workoutTemplates}
      saveNotice={page.saveNotice}
      emptyStateTitle="No workout templates yet."
      emptyStateMessage="Build a reusable template here, then slot it into your week from Plan."
      onUpdateWorkoutTemplateMeta={(field, value) => {
        page = {
          ...page,
          workoutTemplateForm: {
            ...page.workoutTemplateForm,
            [field]: value,
          },
        };
      }}
      onSearchQueryChange={(value) => {
        page = updateMovementExerciseSearchQuery(page, value);
      }}
      onSearchExercises={searchExercises}
      onSaveTemplate={saveTemplate}
      onAddExercise={addExercise}
      onAddExerciseRow={addExerciseRow}
      onUpdateExerciseField={updateExerciseField}
      onRemoveExerciseRow={removeExerciseRow}
    />
  </div>
{/if}

<style>
  .movement-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
</style>
