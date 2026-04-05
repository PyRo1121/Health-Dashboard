<script lang="ts">
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import WorkoutTemplateStudioShell from '$lib/features/movement/components/WorkoutTemplateStudioShell.svelte';
  import {
    createMovementPageState,
    loadMovementPage,
    saveMovementWorkoutTemplatePage,
    searchMovementExercises,
  } from './client';

  let page = $state(createMovementPageState());

  async function refreshData() {
    page = await loadMovementPage();
  }

  onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/movement" />

{#if page.loading}
  <p class="status-copy">Loading movement…</p>
{:else}
  <div class="page-grid movement-grid">
    <WorkoutTemplateStudioShell
      {page}
      title="Build workout templates"
      saveNotice={page.saveNotice}
      emptyStateTitle="No workout templates yet."
      emptyStateMessage="Build a reusable template here, then slot it into your week from Plan."
      onPageChange={(nextPage) => {
        page = {
          ...page,
          ...nextPage,
        };
      }}
      onSearchExercises={async (studioPage) =>
        await searchMovementExercises({
          ...page,
          ...studioPage,
        })}
      onSaveTemplate={async (studioPage) =>
        await saveMovementWorkoutTemplatePage({
          ...page,
          ...studioPage,
        })}
    />
  </div>
{/if}

<style>
  .movement-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
</style>
