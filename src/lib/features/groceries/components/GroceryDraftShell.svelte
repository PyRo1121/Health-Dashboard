<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import type { GroceryItem, RecipeCatalogItem } from '$lib/core/domain/types';
  import GroceryChecklist from './GroceryChecklist.svelte';
  import GroceryWarningsList from './GroceryWarningsList.svelte';

  type GroceryDraftShellState = {
    groceryItems: GroceryItem[];
    groceryWarnings: string[];
    recipeCatalogItems: RecipeCatalogItem[];
  };

  type GroceryDraftState = {
    manualLabel: string;
    manualQuantityText: string;
  };

  let {
    title,
    shellState,
    draftState,
    notice,
    emptyTitle,
    emptyMessage,
    emptyWarningMessage,
    onDraftStateChange,
    onAddManualItem,
    onRemoveManualItem,
    onToggleItem,
    header,
  }: {
    title: string;
    shellState: GroceryDraftShellState;
    draftState: GroceryDraftState;
    notice: string;
    emptyTitle: string;
    emptyMessage: string;
    emptyWarningMessage: string;
    onDraftStateChange: (nextDraftState: GroceryDraftState) => void;
    onAddManualItem: (draftState: GroceryDraftState) => Promise<boolean> | boolean;
    onRemoveManualItem: (itemId: string) => Promise<void> | void;
    onToggleItem: (
      itemId: string,
      patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
    ) => Promise<void> | void;
    header?: Snippet;
  } = $props();

  function updateDraftState(nextDraftState: GroceryDraftState) {
    onDraftStateChange(nextDraftState);
  }

  async function addManualItem() {
    const shouldReset = await onAddManualItem(draftState);
    if (shouldReset) {
      updateDraftState({
        manualLabel: '',
        manualQuantityText: '',
      });
    }
  }
</script>

<SectionCard {title}>
  {@render header?.()}
  {#if notice}
    <p class="status-copy">{notice}</p>
  {/if}
  <div class="manual-entry-grid">
    <Field label="Manual grocery item">
      <input
        value={draftState.manualLabel}
        aria-label="Manual grocery item"
        oninput={(event) =>
          updateDraftState({
            ...draftState,
            manualLabel: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </Field>
    <Field label="Manual quantity">
      <input
        value={draftState.manualQuantityText}
        aria-label="Manual quantity"
        oninput={(event) =>
          updateDraftState({
            ...draftState,
            manualQuantityText: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </Field>
  </div>
  <Button variant="secondary" onclick={addManualItem}>Add manual item</Button>
  <GroceryWarningsList warnings={shellState.groceryWarnings} />
  <GroceryChecklist
    groceryItems={shellState.groceryItems}
    groceryWarnings={shellState.groceryWarnings}
    recipeCatalogItems={shellState.recipeCatalogItems}
    {emptyTitle}
    {emptyMessage}
    {emptyWarningMessage}
    onToggleItem={(itemId, patch) => onToggleItem(itemId, patch)}
    onRemoveManualItem={(itemId) => onRemoveManualItem(itemId)}
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
