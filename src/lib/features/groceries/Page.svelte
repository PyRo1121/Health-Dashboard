<script lang="ts">
  import { SectionCard } from '$lib/core/ui/primitives';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import GroceryChecklist from '$lib/features/groceries/components/GroceryChecklist.svelte';
  import GroceryWarningsList from '$lib/features/groceries/components/GroceryWarningsList.svelte';
  import { createGroceriesPageState, loadGroceriesPage, toggleGroceryItemPage } from './client';

  let page = $state(createGroceriesPageState());

  async function refreshData() {
    page = await loadGroceriesPage();
  }

  async function toggleGrocery(
    itemId: string,
    checked: boolean,
    excluded: boolean,
    onHand: boolean
  ) {
    page = await toggleGroceryItemPage(page, itemId, { checked, excluded, onHand });
  }

  onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/groceries" />

{#if page.loading}
  <p class="status-copy">Loading groceries…</p>
{:else}
  <div class="page-grid groceries-grid">
    <SectionCard title="This week's grocery engine">
      {#if page.weeklyPlan}
        <p class="status-copy">{page.weeklyPlan.title} · week of {page.weeklyPlan.weekStart}</p>
      {/if}
      {#if page.saveNotice}
        <p class="status-copy">{page.saveNotice}</p>
      {/if}
      <GroceryWarningsList warnings={page.groceryWarnings} />
    </SectionCard>

    <SectionCard title="Checklist">
      <GroceryChecklist
        groceryItems={page.groceryItems}
        groceryWarnings={page.groceryWarnings}
        recipeCatalogItems={page.recipeCatalogItems}
        emptyTitle="No grocery items yet."
        emptyMessage="Plan at least one recipe this week and the grocery checklist will appear here."
        emptyWarningMessage="No grocery items could be derived from the current recipe slots."
        onToggleItem={(itemId, patch) =>
          toggleGrocery(itemId, patch.checked, patch.excluded, patch.onHand)}
      />
    </SectionCard>
  </div>
{/if}
