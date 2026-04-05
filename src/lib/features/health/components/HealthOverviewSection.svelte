<script lang="ts">
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';

  let {
    localDay,
    sleepCardLines,
    saveNotice,
  }: {
    localDay: string;
    sleepCardLines: string[];
    saveNotice: string;
  } = $props();
</script>

<SectionCard title="Today at a glance">
  <p class="status-copy">Date: {localDay}</p>
  {#if sleepCardLines.length}
    <ul class="summary-list">
      {#each sleepCardLines as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No imported sleep yet."
      message="When sleep-duration data lands, it will show up here beside your manual health logging."
    />
  {/if}

  {#if saveNotice}
    <p class="status-copy">{saveNotice}</p>
  {/if}
</SectionCard>
