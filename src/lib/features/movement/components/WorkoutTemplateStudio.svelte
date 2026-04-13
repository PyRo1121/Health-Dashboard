<script lang="ts">
  import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
  import type { ExerciseCatalogItem, WorkoutTemplate } from '$lib/core/domain/types';
  import {
    createExerciseSearchRows,
    createWorkoutTemplateSummary,
    type WorkoutTemplateFormState,
  } from '$lib/features/movement/model';

  let {
    title,
    workoutTemplateForm,
    exerciseSearchQuery,
    exerciseSearchResults,
    workoutTemplates,
    saveNotice,
    emptyStateTitle,
    emptyStateMessage,
    onUpdateWorkoutTemplateMeta,
    onSearchQueryChange,
    onSearchExercises,
    onSaveTemplate,
    onAddExercise,
    onAddExerciseRow,
    onUpdateExerciseField,
    onRemoveExerciseRow,
  }: {
    title: string;
    workoutTemplateForm: WorkoutTemplateFormState;
    exerciseSearchQuery: string;
    exerciseSearchResults: ExerciseCatalogItem[];
    workoutTemplates: WorkoutTemplate[];
    saveNotice: string;
    emptyStateTitle: string;
    emptyStateMessage: string;
    onUpdateWorkoutTemplateMeta: (field: 'title' | 'goal', value: string) => void;
    onSearchQueryChange: (value: string) => void;
    onSearchExercises: () => void;
    onSaveTemplate: () => void;
    onAddExercise: (exerciseId: string) => void;
    onAddExerciseRow: () => void;
    onUpdateExerciseField: (
      index: number,
      field: 'name' | 'sets' | 'reps' | 'restSeconds',
      value: string
    ) => void;
    onRemoveExerciseRow: (index: number) => void;
  } = $props();

  let exerciseSearchRows = $derived(createExerciseSearchRows(exerciseSearchResults));
</script>

<SectionCard {title}>
  <Field label="Template name">
    <input
      value={workoutTemplateForm.title}
      aria-label="Template name"
      oninput={(event) =>
        onUpdateWorkoutTemplateMeta('title', (event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <Field label="Goal">
    <input
      value={workoutTemplateForm.goal}
      aria-label="Template goal"
      oninput={(event) =>
        onUpdateWorkoutTemplateMeta('goal', (event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <div class="exercise-editor">
    <p class="exercise-editor__title">Exercises</p>
    {#each workoutTemplateForm.exercises as exercise, index (index)}
      <div class="exercise-row">
        <Field label={`Exercise ${index + 1}`}>
          <input
            value={exercise.name}
            aria-label={`Exercise ${index + 1}`}
            placeholder="Goblet squat"
            oninput={(event) =>
              onUpdateExerciseField(index, 'name', (event.currentTarget as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Sets">
          <input
            value={exercise.sets?.toString() ?? ''}
            aria-label={`Sets ${index + 1}`}
            type="number"
            min="1"
            oninput={(event) =>
              onUpdateExerciseField(index, 'sets', (event.currentTarget as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Reps">
          <input
            value={exercise.reps ?? ''}
            aria-label={`Reps ${index + 1}`}
            placeholder="8"
            oninput={(event) =>
              onUpdateExerciseField(index, 'reps', (event.currentTarget as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Rest">
          <input
            value={exercise.restSeconds?.toString() ?? ''}
            aria-label={`Rest ${index + 1}`}
            type="number"
            min="0"
            placeholder="60"
            oninput={(event) =>
              onUpdateExerciseField(
                index,
                'restSeconds',
                (event.currentTarget as HTMLInputElement).value
              )}
          />
        </Field>
        <div class="button-row compact-row-actions">
          <Button variant="ghost" onclick={() => onRemoveExerciseRow(index)}>Remove exercise</Button
          >
        </div>
      </div>
    {/each}
    <div class="button-row">
      <Button variant="ghost" onclick={onAddExerciseRow}>Add exercise row</Button>
    </div>
  </div>
  <Field label="Search exercises">
    <input
      value={exerciseSearchQuery}
      aria-label="Search exercises"
      placeholder="Search wger exercises"
      oninput={(event) => onSearchQueryChange((event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <div class="button-row">
    <Button variant="secondary" onclick={onSearchExercises}>Search exercises</Button>
  </div>
  {#if exerciseSearchRows.length}
    <ul class="entry-list">
      {#each exerciseSearchRows as exercise (exercise.id)}
        <li>
          <div>
            <strong>{exercise.title}</strong>
            <p>{exercise.detail}</p>
          </div>
          <Button variant="ghost" onclick={() => onAddExercise(exercise.id)}>Add exercise</Button>
        </li>
      {/each}
    </ul>
  {/if}
  <div class="button-row">
    <Button variant="secondary" onclick={onSaveTemplate}>Save template</Button>
  </div>
  {#if saveNotice}
    <p class="status-copy">{saveNotice}</p>
  {/if}

  {#if workoutTemplates.length}
    <ul class="entry-list">
      {#each workoutTemplates as template (template.id)}
        <li>
          <div>
            <strong>{template.title}</strong>
            <p>{createWorkoutTemplateSummary(template)}</p>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState title={emptyStateTitle} message={emptyStateMessage} />
  {/if}
</SectionCard>

<style>
  .exercise-editor {
    display: grid;
    gap: 0.9rem;
    margin: 1rem 0;
  }

  .exercise-editor__title {
    margin: 0;
    font:
      700 0.9rem/1.2 Manrope,
      system-ui,
      sans-serif;
    color: var(--phc-text);
  }

  .exercise-row {
    display: grid;
    gap: 0.75rem;
    padding: 0.85rem;
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(0, 23, 15, 0.32);
  }

  .compact-row-actions {
    margin-top: 0;
  }
</style>
