<script lang="ts">
  import { SectionCard } from '$lib/core/ui/primitives';
  import type { TodaySnapshot } from '$lib/features/today/snapshot';

  let { snapshot }: { snapshot: TodaySnapshot | null } = $props();
</script>

<SectionCard title="Journal prompt">
  {#if snapshot?.latestJournalEntry}
    <h3 class="card-subtitle">{snapshot.latestJournalEntry.title ?? 'Latest reflection'}</h3>
    <p>{snapshot.latestJournalEntry.body}</p>
  {:else}
    <p class="status-copy">What grounded you today? Reflect on one moment of clarity.</p>
  {/if}
</SectionCard>
