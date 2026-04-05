<script lang="ts">
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import type { GroceryItem, RecipeCatalogItem } from '$lib/core/domain/types';
  import GroceryChecklist from '$lib/features/groceries/components/GroceryChecklist.svelte';
  import GroceryWarningsList from '$lib/features/groceries/components/GroceryWarningsList.svelte';

  let {
    groceryNotice,
    groceryWarnings,
    groceryItems,
    recipeCatalogItems,
    manualLabel,
    manualQuantityText,
    onManualLabelChange,
    onManualQuantityChange,
    onAddManualItem,
    onRemoveManualItem,
    onToggleItem,
  }: {
    groceryNotice: string;
    groceryWarnings: string[];
    groceryItems: GroceryItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    manualLabel: string;
    manualQuantityText: string;
    onManualLabelChange: (value: string) => void;
    onManualQuantityChange: (value: string) => void;
    onAddManualItem: () => void;
    onRemoveManualItem: (itemId: string) => void;
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
  <div class="manual-entry-grid">
    <Field label="Manual grocery item">
      <input
        value={manualLabel}
        aria-label="Manual grocery item"
        oninput={(event) => onManualLabelChange((event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Manual quantity">
      <input
        value={manualQuantityText}
        aria-label="Manual quantity"
        oninput={(event) => onManualQuantityChange((event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <Button variant="secondary" onclick={onAddManualItem}>Add manual item</Button>
  <GroceryWarningsList warnings={groceryWarnings} />
  <GroceryChecklist
    {groceryItems}
    {groceryWarnings}
    {recipeCatalogItems}
    emptyTitle="No grocery items yet."
    emptyMessage="Plan at least one recipe this week and the grocery draft will appear here."
    emptyWarningMessage="No grocery items could be derived from the current recipe slots."
    {onToggleItem}
    {onRemoveManualItem}
  />
</SectionCard>

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
