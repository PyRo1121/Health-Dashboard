<script lang="ts">
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import GroceryDraftShell from '$lib/features/groceries/components/GroceryDraftShell.svelte';
  import {
    addManualGroceryItemPage,
    createGroceryDraftState,
    createGroceriesPageState,
    loadGroceriesPage,
    removeManualGroceryItemPage,
    toggleGroceryItemPage,
  } from './client';

  let page = $state(createGroceriesPageState());
  let draftState = $state(createGroceryDraftState());

  async function refreshData() {
    page = await loadGroceriesPage();
  }

  async function addManualItem(nextDraftState: typeof draftState) {
    page = await addManualGroceryItemPage(page, {
      label: nextDraftState.manualLabel,
      quantityText: nextDraftState.manualQuantityText,
    });
    return page.saveNotice === 'Manual grocery item added.';
  }

  async function removeManualItem(itemId: string) {
    page = await removeManualGroceryItemPage(page, itemId);
  }

  onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/groceries" />

{#if page.loading}
  <p class="status-copy">Loading groceries…</p>
{:else}
  <div class="page-grid groceries-grid">
    <GroceryDraftShell
      title="This week's grocery engine"
      shellState={page}
      {draftState}
      notice={page.saveNotice}
      emptyTitle="No grocery items yet."
      emptyMessage="Plan at least one recipe this week and the grocery checklist will appear here."
      emptyWarningMessage="No grocery items could be derived from the current recipe slots."
      onDraftStateChange={(nextDraftState) => {
        draftState = nextDraftState;
      }}
      onAddManualItem={addManualItem}
      onRemoveManualItem={removeManualItem}
      onToggleItem={async (itemId, patch) => {
        page = await toggleGroceryItemPage(page, itemId, patch);
      }}
    >
      {#snippet header()}
        {#if page.weeklyPlan}
          <p class="status-copy">{page.weeklyPlan.title} · week of {page.weeklyPlan.weekStart}</p>
        {/if}
      {/snippet}
    </GroceryDraftShell>
  </div>
{/if}
