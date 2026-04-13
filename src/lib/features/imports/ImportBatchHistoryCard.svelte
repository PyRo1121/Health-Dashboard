<script lang="ts">
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { ImportBatch } from '$lib/core/domain/types';

  interface Props {
    batches: ImportBatch[];
  }

  let { batches }: Props = $props();
</script>

<SectionCard title="Import batch history">
  {#if batches.length}
    <ul class="entry-list batch-list">
      {#each batches as batch (batch.id)}
        <li>
          <strong>{batch.sourceType}</strong>
          <span>{batch.status}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No import batches yet."
      message="Preview an import first. You should always see what will change before committing it."
    />
  {/if}
</SectionCard>

<style>
  .batch-list {
    margin-top: 1rem;
  }

  .batch-list li {
    padding-bottom: 0.75rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }
</style>
