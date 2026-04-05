<script lang="ts">
  import { Button } from '$lib/core/ui/primitives';
  import type { GroceryItem } from '$lib/core/domain/types';

  let {
    item,
    summary,
    sourceSummary,
    onToggleItem,
  }: {
    item: GroceryItem;
    summary: string;
    sourceSummary?: string;
    onToggleItem: (
      itemId: string,
      patch: Pick<GroceryItem, 'checked' | 'excluded' | 'onHand'>
    ) => void;
  } = $props();
</script>

<li class:item-muted={item.checked || item.excluded || item.onHand}>
  <div class="grocery-copy">
    <strong>{item.label}</strong>
    <p>{summary}</p>
    {#if sourceSummary}
      <p>{sourceSummary}</p>
    {/if}
  </div>
  <div class="grocery-actions">
    <Button
      variant="ghost"
      onclick={() =>
        onToggleItem(item.id, {
          checked: !item.checked,
          excluded: item.excluded,
          onHand: item.onHand,
        })}
    >
      {item.checked ? 'Uncheck' : 'Check'}
    </Button>
    <Button
      variant="ghost"
      onclick={() =>
        onToggleItem(item.id, {
          checked: item.checked,
          excluded: !item.excluded,
          onHand: item.onHand,
        })}
    >
      {item.excluded ? 'Include' : 'Exclude'}
    </Button>
    <Button
      variant="ghost"
      onclick={() =>
        onToggleItem(item.id, {
          checked: item.checked,
          excluded: item.excluded,
          onHand: !item.onHand,
        })}
    >
      {item.onHand ? 'Need it' : 'On hand'}
    </Button>
  </div>
</li>

<style>
  .grocery-copy p {
    margin: 0.25rem 0 0;
    color: #655e54;
  }

  .grocery-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .item-muted {
    opacity: 0.68;
  }
</style>
