<script lang="ts">
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewCorrelation } from '$lib/features/review/analytics';

  let {
    correlations,
  }: {
    correlations: ReviewCorrelation[];
  } = $props();
</script>

<SectionCard title="Explainable correlations">
  {#if correlations.length}
    <ul class="summary-list">
      {#each correlations as correlation (correlation.label)}
        <li>
          <strong>{correlation.label}</strong>
          <p>{correlation.detail}</p>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="Need more tracked days."
      message="Log a fuller week before the app calls patterns with confidence."
    />
  {/if}
</SectionCard>

<style>
  .summary-list p {
    margin: 0.25rem 0 0;
    color: #3a352e;
  }
</style>
