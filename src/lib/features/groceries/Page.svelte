<script lang="ts">
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import GroceryChecklist from '$lib/features/groceries/components/GroceryChecklist.svelte';
  import GroceryWarningsList from '$lib/features/groceries/components/GroceryWarningsList.svelte';
  import {
    addManualGroceryItemPage,
    createGroceriesPageState,
    loadGroceriesPage,
    removeManualGroceryItemPage,
    toggleGroceryItemPage,
  } from './client';

  let page = $state(createGroceriesPageState());
  let manualLabel = $state('');
  let manualQuantityText = $state('');

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

  async function addManualItem() {
    page = await addManualGroceryItemPage(page, {
      label: manualLabel,
      quantityText: manualQuantityText,
    });
    if (page.saveNotice === 'Manual grocery item added.') {
      manualLabel = '';
      manualQuantityText = '';
    }
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
    <SectionCard title="This week's grocery engine">
      {#if page.weeklyPlan}
        <p class="status-copy">{page.weeklyPlan.title} · week of {page.weeklyPlan.weekStart}</p>
      {/if}
      {#if page.saveNotice}
        <p class="status-copy">{page.saveNotice}</p>
      {/if}
      <div class="manual-entry-grid">
        <Field label="Manual grocery item">
          <input bind:value={manualLabel} aria-label="Manual grocery item" />
        </Field>
        <Field label="Manual quantity">
          <input bind:value={manualQuantityText} aria-label="Manual quantity" />
        </Field>
      </div>
      <Button variant="secondary" onclick={addManualItem}>Add manual item</Button>
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
        onRemoveManualItem={removeManualItem}
      />
    </SectionCard>
  </div>
{/if}

<style>
  .manual-entry-grid {
    display: grid;
    gap: 0.75rem;
    margin-block: 0.75rem;
  }

  @media (min-width: 720px) {
    .manual-entry-grid {
      grid-template-columns: minmax(0, 2fr) minmax(12rem, 1fr);
    }
  }
</style>
