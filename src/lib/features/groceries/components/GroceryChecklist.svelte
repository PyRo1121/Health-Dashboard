<script lang="ts">
  import { EmptyState } from '$lib/core/ui/primitives';
  import type { GroceryItem, RecipeCatalogItem } from '$lib/core/domain/types';
  import {
    createGroceryGroups,
    createGrocerySourceSummary,
    createGrocerySummary,
  } from '$lib/features/groceries/model';
  import GroceryChecklistRow from './GroceryChecklistRow.svelte';

  let {
    groceryItems,
    groceryWarnings,
    recipeCatalogItems,
    emptyTitle,
    emptyMessage,
    emptyWarningMessage,
    onToggleItem,
    onRemoveManualItem,
  }: {
    groceryItems: GroceryItem[];
    groceryWarnings: string[];
    recipeCatalogItems: RecipeCatalogItem[];
    emptyTitle: string;
    emptyMessage: string;
    emptyWarningMessage: string;
    onToggleItem: (
      itemId: string,
      patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
    ) => void;
    onRemoveManualItem?: (itemId: string) => void;
  } = $props();

  let groceryGroups = $derived(createGroceryGroups(groceryItems));
</script>

{#if groceryGroups.length}
  <div class="grocery-groups">
    {#each groceryGroups as group (group.aisle)}
      <section class="grocery-group">
        <h3>{group.aisle}</h3>
        <ul class="entry-list">
          {#each group.items as item (item.id)}
            <GroceryChecklistRow
              {item}
              summary={createGrocerySummary(item)}
              sourceSummary={item.sourceRecipeIds.length
                ? createGrocerySourceSummary(item, recipeCatalogItems)
                : item.manual
                  ? createGrocerySourceSummary(item, recipeCatalogItems)
                  : undefined}
              {onToggleItem}
              {onRemoveManualItem}
            />
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{:else if groceryWarnings.length}
  <p class="status-copy">{emptyWarningMessage}</p>
{:else}
  <EmptyState title={emptyTitle} message={emptyMessage} />
{/if}

<style>
  .grocery-groups {
    display: grid;
    gap: 1rem;
  }

  .grocery-group h3 {
    margin: 0 0 0.75rem;
    font:
      700 0.9rem/1.2 Manrope,
      system-ui,
      sans-serif;
    color: var(--phc-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
</style>
