<script lang="ts">
  import PlanningGroceryDraft from '$lib/features/planning/components/PlanningGroceryDraft.svelte';
  import PlanningSlotComposer from '$lib/features/planning/components/PlanningSlotComposer.svelte';
  import PlanningBoard from '$lib/features/planning/components/PlanningBoard.svelte';
  import WorkoutTemplateStudioShell from '$lib/features/movement/components/WorkoutTemplateStudioShell.svelte';
  import {
    addManualPlanningGroceryItemPage,
    createPlanningPageState,
    deletePlanningSlotPage,
    loadPlanningPage,
    markPlanningSlotStatusPage,
    movePlanningSlotPage,
    removeManualPlanningGroceryItemPage,
    savePlanningSlotPage,
    saveWorkoutTemplatePage,
    searchPlanningExercises,
    togglePlanningGroceryStatePage,
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

    <WorkoutTemplateStudioShell
      {page}
      title="Workout templates"
      saveNotice={page.workoutTemplateNotice}
      emptyStateTitle="No workout templates yet."
      emptyStateMessage="Build a reusable template here, then add it to your week."
      onPageChange={(nextPage) => {
        page = {
          ...page,
          ...nextPage,
        };
      }}
      onSearchExercises={async (studioPage) =>
        await searchPlanningExercises({
          ...page,
          ...studioPage,
        })}
      onSaveTemplate={async (studioPage) =>
        await saveWorkoutTemplatePage({
          ...page,
          ...studioPage,
        })}
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
