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
    color: var(--phc-muted);
  }

  .summary-list li {
    padding-bottom: 1rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }

  .summary-list li:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .summary-list strong {
    color: var(--phc-text);
    font: 500 1.1rem/1.15 var(--phc-font-display);
    font-style: italic;
  }
</style>
