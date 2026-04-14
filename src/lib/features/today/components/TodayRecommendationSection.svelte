<script lang="ts">
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { TodayRecommendationAction } from '$lib/features/today/intelligence';
  import { createTodayConfidenceLabel } from '$lib/features/today/model';
  import type { TodaySnapshot } from '$lib/features/today/snapshot';
  import TodayRecommendationActionControl from '$lib/features/today/components/TodayRecommendationActionControl.svelte';

  let {
    snapshot,
    recommendationSupportRows,
    onRecommendationAction,
  }: {
    snapshot: TodaySnapshot | null;
    recommendationSupportRows: string[];
    onRecommendationAction: (action: TodayRecommendationAction) => void;
  } = $props();

  const recommendation = $derived(snapshot?.intelligence.primaryRecommendation ?? null);
  const fallbackState = $derived(snapshot?.intelligence.fallbackState ?? null);
</script>

<SectionCard title="Today's recommendation">
  {#if recommendation}
    <p class="recommendation-eyebrow caps-label">Best next move</p>
    <div class="recommendation-header">
      <div>
        <h3 class="recommendation-title">{recommendation.title}</h3>
        <p class="recommendation-summary">{recommendation.summary}</p>
      </div>
      <span class={`confidence-badge confidence-badge--${recommendation.confidence}`}>
        {createTodayConfidenceLabel(recommendation.confidence)}
      </span>
    </div>

    <ul class="recommendation-list">
      {#each recommendation.reasons as line (line)}
        <li>{line}</li>
      {/each}
    </ul>

    {#if recommendation.provenance.length}
      <div class="recommendation-provenance divider-block">
        <p class="provenance-label">Why this is showing up</p>
        <ul class="recommendation-list compact-list">
          {#each recommendation.provenance as row (row.label)}
            <li>{row.label}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="recommendation-actions">
      <TodayRecommendationActionControl
        action={recommendation.primaryAction}
        classes="recommendation-action action-control action-control--primary"
        onAction={onRecommendationAction}
      />

      {#if recommendation.secondaryAction}
        {@const secondaryAction = recommendation.secondaryAction}
        <TodayRecommendationActionControl
          action={secondaryAction}
          classes="recommendation-action action-control"
          onAction={onRecommendationAction}
        />
      {/if}
    </div>

    {#if recommendationSupportRows.length}
      <div class="supporting-context divider-block">
        {#each recommendationSupportRows as row (row)}
          <p>{row}</p>
        {/each}
      </div>
    {/if}

    {#if recommendation.supportingAction}
      {@const supportingAction = recommendation.supportingAction}
      <div class="supporting-link-row">
        <TodayRecommendationActionControl
          action={supportingAction}
          classes="recommendation-action action-control action-control--support"
          onAction={onRecommendationAction}
        />
      </div>
    {/if}
  {:else if fallbackState}
    <EmptyState title={fallbackState.title} message={fallbackState.message} />
    {#if fallbackState.action}
      <div class="recommendation-actions recommendation-actions--fallback">
        <TodayRecommendationActionControl
          action={fallbackState.action}
          classes="recommendation-action action-control action-control--primary"
          onAction={onRecommendationAction}
        />
      </div>
    {/if}
  {:else}
    <EmptyState
      title="No recommendation yet."
      message="Today will promote one next move when enough signal is available."
    />
  {/if}
</SectionCard>

<style>
  .recommendation-eyebrow {
    margin: 0 0 0.35rem;
    color: var(--phc-muted);
  }

  .recommendation-header {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: flex-start;
  }

  .recommendation-title {
    margin: 0;
    font:
      700 1.2rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  .recommendation-summary {
    margin: 0.45rem 0 0;
    color: var(--phc-text);
  }

  .confidence-badge {
    display: inline-flex;
    padding: 0.45rem 0.7rem;
    border: 0.5px solid var(--phc-border-soft);
    font:
      700 0.78rem/1 Manrope,
      system-ui,
      sans-serif;
    white-space: nowrap;
  }

  .confidence-badge--high {
    background: rgba(10, 60, 45, 0.22);
    color: var(--phc-text);
  }

  .confidence-badge--medium {
    background: rgba(233, 195, 73, 0.12);
    color: var(--phc-label);
  }

  .confidence-badge--low {
    background: rgba(147, 195, 174, 0.12);
    color: var(--phc-muted);
  }

  .recommendation-list {
    margin: 0.9rem 0 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.45rem;
    color: var(--phc-text);
  }

  .provenance-label {
    margin: 0;
    color: var(--phc-muted);
    font:
      700 0.8rem/1.2 Manrope,
      system-ui,
      sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .compact-list {
    margin-top: 0.6rem;
  }

  .recommendation-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 1rem;
  }

  .recommendation-actions--fallback {
    margin-top: 0.75rem;
  }

  .recommendation-action {
    width: fit-content;
  }

  .supporting-context {
    display: grid;
    gap: 0.45rem;
  }

  .supporting-context p {
    margin: 0;
    color: var(--phc-muted);
  }

  .supporting-link-row {
    margin-top: 0.85rem;
  }
</style>
