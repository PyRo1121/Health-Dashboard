<script lang="ts">
  import PlanningGroceryDraft from '$lib/features/planning/components/PlanningGroceryDraft.svelte';
  import PlanningSlotComposer from '$lib/features/planning/components/PlanningSlotComposer.svelte';
  import PlanningBoard from '$lib/features/planning/components/PlanningBoard.svelte';
  import WorkoutTemplateStudio from '$lib/features/movement/components/WorkoutTemplateStudio.svelte';
  import {
    addManualPlanningGroceryItemPage,
    addEmptyExerciseToWorkoutTemplate,
    addExerciseToWorkoutTemplate,
    createPlanningPageState,
    deletePlanningSlotPage,
    loadPlanningPage,
    markPlanningSlotStatusPage,
    movePlanningSlotPage,
    removeManualPlanningGroceryItemPage,
    removeWorkoutTemplateExercise,
    savePlanningSlotPage,
    saveWorkoutTemplatePage,
    searchPlanningExercises,
    togglePlanningGroceryStatePage,
    updateWorkoutTemplateExerciseField,
  } from '$lib/features/planning/client';
  import { createPlanningBoardDays } from '$lib/features/planning/model';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

  let page = $state(createPlanningPageState());
  let boardDays = $derived(createPlanningBoardDays(page.weekDays, page.slots));
  let manualLabel = $state('');
  let manualQuantityText = $state('');

  async function refreshData() {
    page = await loadPlanningPage(undefined, page);
  }

  async function saveSlot() {
    page = await savePlanningSlotPage(page);
  }

  async function saveTemplate() {
    page = await saveWorkoutTemplatePage(page);
  }

  async function searchExercises() {
    page = await searchPlanningExercises(page);
  }

  async function markSlot(slotId: string, status: 'planned' | 'done' | 'skipped') {
    page = await markPlanningSlotStatusPage(page, slotId, status);
  }

  async function removeSlot(slotId: string) {
    page = await deletePlanningSlotPage(page, slotId);
  }

  async function moveSlot(slotId: string, direction: 'up' | 'down') {
    page = await movePlanningSlotPage(page, slotId, direction);
  }

  async function toggleGrocery(
    itemId: string,
    checked: boolean,
    excluded: boolean,
    onHand: boolean
  ) {
    page = await togglePlanningGroceryStatePage(page, itemId, { checked, excluded, onHand });
  }

  async function addManualGroceryItem() {
    page = await addManualPlanningGroceryItemPage(page, {
      label: manualLabel,
      quantityText: manualQuantityText,
    });
    if (page.groceryNotice === 'Manual grocery item added.') {
      manualLabel = '';
      manualQuantityText = '';
    }
  }

  async function removeManualGroceryItem(itemId: string) {
    page = await removeManualPlanningGroceryItemPage(page, itemId);
  }

  function updatePlanningSlotForm(patch: Partial<typeof page.slotForm>) {
    page = {
      ...page,
      slotForm: {
        ...page.slotForm,
        ...patch,
      },
    };
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

<RoutePageHeader href="/plan" />

{#if page.loading}
  <p class="status-copy">Loading weekly plan…</p>
{:else}
  <div class="page-grid plan-grid">
    <PlanningSlotComposer
      weekDays={page.weekDays}
      slotForm={page.slotForm}
      recipeCatalogItems={page.recipeCatalogItems}
      foodCatalogItems={page.foodCatalogItems}
      workoutTemplates={page.workoutTemplates}
      planNotice={page.planNotice}
      onLocalDayChange={(localDay) => updatePlanningSlotForm({ localDay })}
      onSlotTypeChange={(slotType) => updatePlanningSlotForm({ slotType })}
      onMealSourceChange={(mealSource) =>
        updatePlanningSlotForm({
          mealSource,
          recipeId: '',
          foodCatalogItemId: '',
        })}
      onRecipeChange={(recipeId) => updatePlanningSlotForm({ recipeId })}
      onFoodChange={(foodCatalogItemId) => updatePlanningSlotForm({ foodCatalogItemId })}
      onWorkoutTemplateChange={(workoutTemplateId) => updatePlanningSlotForm({ workoutTemplateId })}
      onTitleChange={(title) => updatePlanningSlotForm({ title })}
      onNotesChange={(notes) => updatePlanningSlotForm({ notes })}
      onSaveSlot={saveSlot}
    />

    <WorkoutTemplateStudio
      title="Workout templates"
      workoutTemplateForm={page.workoutTemplateForm}
      exerciseSearchQuery={page.exerciseSearchQuery}
      exerciseSearchResults={page.exerciseSearchResults}
      workoutTemplates={page.workoutTemplates}
      saveNotice={page.workoutTemplateNotice}
      emptyStateTitle="No workout templates yet."
      emptyStateMessage="Build a reusable template here, then add it to your week."
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
        page = {
          ...page,
          exerciseSearchQuery: value,
        };
      }}
      onSearchExercises={searchExercises}
      onSaveTemplate={saveTemplate}
      onAddExercise={addExercise}
      onAddExerciseRow={addExerciseRow}
      onUpdateExerciseField={updateExerciseField}
      onRemoveExerciseRow={removeExerciseRow}
    />

    <PlanningBoard
      {boardDays}
      foodCatalogItems={page.foodCatalogItems}
      recipeCatalogItems={page.recipeCatalogItems}
      workoutTemplates={page.workoutTemplates}
      exerciseCatalogItems={page.exerciseCatalogItems}
      onMoveSlot={moveSlot}
      onMarkSlot={markSlot}
      onRemoveSlot={removeSlot}
    />

    <PlanningGroceryDraft
      groceryNotice={page.groceryNotice}
      groceryWarnings={page.groceryWarnings}
      groceryItems={page.groceryItems}
      recipeCatalogItems={page.recipeCatalogItems}
      {manualLabel}
      {manualQuantityText}
      onManualLabelChange={(value) => {
        manualLabel = value;
      }}
      onManualQuantityChange={(value) => {
        manualQuantityText = value;
      }}
      onAddManualItem={addManualGroceryItem}
      onRemoveManualItem={removeManualGroceryItem}
      onToggleItem={(itemId, patch) =>
        toggleGrocery(itemId, patch.checked, patch.excluded, patch.onHand)}
    />
  </div>
{/if}

<style>
  @media (min-width: 960px) {
    .plan-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .plan-grid :global(section:nth-child(3)) {
      grid-column: 1 / -1;
    }
  }
</style>
