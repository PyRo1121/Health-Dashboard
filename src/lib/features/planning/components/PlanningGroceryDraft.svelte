<script lang="ts">
  import { SectionCard } from '$lib/core/ui/primitives';
  import type { GroceryItem, RecipeCatalogItem } from '$lib/core/domain/types';
  import GroceryChecklist from '$lib/features/groceries/components/GroceryChecklist.svelte';
  import GroceryWarningsList from '$lib/features/groceries/components/GroceryWarningsList.svelte';

  let {
    groceryNotice,
    groceryWarnings,
    groceryItems,
    recipeCatalogItems,
    onToggleItem,
  }: {
    groceryNotice: string;
    groceryWarnings: string[];
    groceryItems: GroceryItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    onToggleItem: (
      itemId: string,
      patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
    ) => void;
  } = $props();
</script>

<SectionCard title="Grocery draft">
  {#if groceryNotice}
    <p class="status-copy">{groceryNotice}</p>
  {/if}
  <GroceryWarningsList warnings={groceryWarnings} />
  <GroceryChecklist
    {groceryItems}
    {groceryWarnings}
    {recipeCatalogItems}
    emptyTitle="No grocery items yet."
    emptyMessage="Plan at least one recipe this week and the grocery draft will appear here."
    emptyWarningMessage="No grocery items could be derived from the current recipe slots."
    {onToggleItem}
  />
</SectionCard>
