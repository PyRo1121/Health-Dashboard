<script lang="ts">
  import type { GroceryDraftState } from '$lib/features/groceries/controller';
  import type { GroceryItem, RecipeCatalogItem } from '$lib/core/domain/types';
  import GroceryDraftShell from '$lib/features/groceries/components/GroceryDraftShell.svelte';

  let {
    groceryNotice,
    groceryWarnings,
    groceryItems,
    recipeCatalogItems,
    draftState,
    onDraftStateChange,
    onAddManualItem,
    onRemoveManualItem,
    onToggleItem,
  }: {
    groceryNotice: string;
    groceryWarnings: string[];
    groceryItems: GroceryItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    draftState: GroceryDraftState;
    onDraftStateChange: (nextDraftState: GroceryDraftState) => void;
    onAddManualItem: (draftState: GroceryDraftState) => Promise<boolean>;
    onRemoveManualItem: (itemId: string) => void;
    onToggleItem: (
      itemId: string,
      patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
    ) => void;
  } = $props();
</script>

<GroceryDraftShell
  title="Grocery draft"
  shellState={{
    groceryItems,
    groceryWarnings,
    recipeCatalogItems,
  }}
  {draftState}
  notice={groceryNotice}
  emptyTitle="No grocery items yet."
  emptyMessage="Plan at least one recipe this week and the grocery draft will appear here."
  emptyWarningMessage="No grocery items could be derived from the current recipe slots."
  {onDraftStateChange}
  {onAddManualItem}
  {onRemoveManualItem}
  {onToggleItem}
/>
