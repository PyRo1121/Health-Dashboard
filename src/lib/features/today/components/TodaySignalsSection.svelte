<script lang="ts">
  import { resolve } from '$app/paths';
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { TodayRecommendationAction } from '$lib/features/today/intelligence';
  import {
    createTodayConfidenceLabel,
    isTodayRecommendationHrefAction,
    type TodayNutritionPulseMetric,
  } from '$lib/features/today/model';
  import type { TodaySnapshot } from '$lib/features/today/snapshot';

  let {
    snapshot,
    todayNutritionPulseMetrics,
    todayNutritionGuidance,
    todayNutritionRows,
    plannedMealProjectionRows,
    recommendationSupportRows,
    onRecommendationAction,
  }: {
    snapshot: TodaySnapshot | null;
    todayNutritionPulseMetrics: TodayNutritionPulseMetric[];
    todayNutritionGuidance: string[];
    todayNutritionRows: string[];
    plannedMealProjectionRows: string[];
    recommendationSupportRows: string[];
    onRecommendationAction: (action: TodayRecommendationAction) => void;
  } = $props();

  const recommendation = $derived(snapshot?.intelligence.primaryRecommendation ?? null);
  const fallbackState = $derived(snapshot?.intelligence.fallbackState ?? null);
</script>

<SectionCard title="Today's recommendation">
  {#if recommendation}
    <p class="recommendation-eyebrow">Best next move</p>
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
      <div class="recommendation-provenance">
        <p class="provenance-label">Why this is showing up</p>
        <ul class="recommendation-list compact-list">
          {#each recommendation.provenance as row (row.label)}
            <li>{row.label}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="recommendation-actions">
      {#if isTodayRecommendationHrefAction(recommendation.primaryAction)}
        {#if recommendation.primaryAction.href.startsWith('#')}
          <button
            class="recommendation-button recommendation-button--primary"
            onclick={() =>
              document.getElementById('today-check-in')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {recommendation.primaryAction.label}
          </button>
        {:else}
          <a
            class="recommendation-link recommendation-link--primary"
            href={resolve(recommendation.primaryAction.href as '/journal' | '/nutrition' | '/plan')}
          >
            {recommendation.primaryAction.label}
          </a>
        {/if}
      {:else}
        <button
          class="recommendation-button recommendation-button--primary"
          onclick={() => onRecommendationAction(recommendation.primaryAction)}
        >
          {recommendation.primaryAction.label}
        </button>
      {/if}

      {#if recommendation.secondaryAction}
        {@const secondaryAction = recommendation.secondaryAction}
        {#if isTodayRecommendationHrefAction(secondaryAction)}
          {#if secondaryAction.href.startsWith('#')}
            <button
              class="recommendation-button"
              onclick={() =>
                document.getElementById('today-check-in')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {secondaryAction.label}
            </button>
          {:else}
            <a
              class="recommendation-link"
              href={resolve(secondaryAction.href as '/journal' | '/nutrition' | '/plan')}
            >
              {secondaryAction.label}
            </a>
          {/if}
        {:else}
          <button
            class="recommendation-button"
            onclick={() => onRecommendationAction(secondaryAction)}
          >
            {secondaryAction.label}
          </button>
        {/if}
      {/if}
    </div>

    {#if recommendationSupportRows.length}
      <div class="supporting-context">
        {#each recommendationSupportRows as row (row)}
          <p>{row}</p>
        {/each}
      </div>
    {/if}

    {#if recommendation.supportingAction}
      {@const supportingAction = recommendation.supportingAction}
      <div class="supporting-link-row">
        {#if isTodayRecommendationHrefAction(supportingAction)}
          <a
            class="recommendation-link recommendation-link--support"
            href={resolve(supportingAction.href as '/journal' | '/nutrition' | '/plan')}
            >{supportingAction.label}</a
          >
        {:else}
          <button
            class="recommendation-button"
            onclick={() => onRecommendationAction(supportingAction)}
            >{supportingAction.label}</button
          >
        {/if}
      </div>
    {/if}
  {:else if fallbackState}
    <EmptyState title={fallbackState.title} message={fallbackState.message} />
    {#if fallbackState.action}
      <div class="recommendation-actions recommendation-actions--fallback">
        {#if isTodayRecommendationHrefAction(fallbackState.action)}
          {#if fallbackState.action.href.startsWith('#')}
            <button
              class="recommendation-button recommendation-button--primary"
              onclick={() =>
                document.getElementById('today-check-in')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {fallbackState.action.label}
            </button>
          {:else}
            <a
              class="recommendation-link recommendation-link--primary"
              href={resolve(fallbackState.action.href as '/journal' | '/nutrition' | '/plan')}
            >
              {fallbackState.action.label}
            </a>
          {/if}
        {/if}
      </div>
    {/if}
  {:else}
    <EmptyState
      title="No recommendation yet."
      message="Today will promote one next move when enough signal is available."
    />
  {/if}
</SectionCard>

<SectionCard title="Nutrition pulse">
  {#if snapshot}
    <div class="nutrition-pulse-grid">
      {#each todayNutritionPulseMetrics as metric (metric.label)}
        <article class={`nutrition-pulse-card nutrition-pulse-card--${metric.tone}`}>
          <p class="nutrition-pulse-label">{metric.label}</p>
          <strong>{metric.current} / {metric.target}g</strong>
          {#if metric.projected !== null}
            <p class="status-copy">Planned next: {metric.projected} / {metric.target}g</p>
          {/if}
        </article>
      {/each}
    </div>

    <ul class="nutrition-guidance-list">
      {#each todayNutritionGuidance as line (line)}
        <li>{line}</li>
      {/each}
    </ul>

    <ul class="summary-list">
      {#each todayNutritionRows as row (row)}
        <li>{row}</li>
      {/each}
    </ul>
    {#if plannedMealProjectionRows.length}
      <p class="status-copy">If you log the planned meal next:</p>
      <ul class="summary-list">
        {#each plannedMealProjectionRows as row (row)}
          <li>{row}</li>
        {/each}
      </ul>
    {/if}
  {:else}
    <EmptyState
      title="No nutrition signal yet."
      message="Meals and plans will show their intake impact here."
    />
  {/if}
</SectionCard>

<SectionCard title="Journal prompt">
  {#if snapshot?.latestJournalEntry}
    <h3 class="card-subtitle">{snapshot.latestJournalEntry.title ?? 'Latest reflection'}</h3>
    <p>{snapshot.latestJournalEntry.body}</p>
  {:else}
    <p class="status-copy">What grounded you today? Reflect on one moment of clarity.</p>
  {/if}
</SectionCard>

<style>
  .recommendation-eyebrow {
    margin: 0 0 0.35rem;
    color: #6b6258;
    font:
      700 0.78rem/1.2 Manrope,
      system-ui,
      sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
    color: #4a4338;
  }

  .confidence-badge {
    display: inline-flex;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    font:
      700 0.78rem/1 Manrope,
      system-ui,
      sans-serif;
    white-space: nowrap;
  }

  .confidence-badge--high {
    background: rgba(31, 92, 74, 0.12);
    color: #1f5c4a;
  }

  .confidence-badge--medium {
    background: rgba(184, 126, 42, 0.12);
    color: #8c5e18;
  }

  .confidence-badge--low {
    background: rgba(107, 98, 88, 0.12);
    color: #5d5449;
  }

  .recommendation-list {
    margin: 0.9rem 0 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.45rem;
    color: #3a352e;
  }

  .recommendation-provenance {
    margin-top: 0.9rem;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(31, 29, 26, 0.08);
  }

  .provenance-label {
    margin: 0;
    color: #6b6258;
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

  .recommendation-button,
  .recommendation-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.55rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba(31, 29, 26, 0.12);
    background: rgba(241, 235, 226, 0.9);
    color: #3f2a1f;
    font:
      700 0.9rem/1 Manrope,
      system-ui,
      sans-serif;
    text-decoration: none;
    cursor: pointer;
  }

  .recommendation-button--primary,
  .recommendation-link--primary {
    border-color: rgba(31, 92, 74, 0.16);
    background: rgba(31, 92, 74, 0.1);
    color: #1f5c4a;
  }

  .recommendation-link--support {
    color: #6b3d2b;
  }

  .supporting-context {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(31, 29, 26, 0.08);
    display: grid;
    gap: 0.45rem;
  }

  .supporting-context p {
    margin: 0;
    color: #5d5449;
  }

  .supporting-link-row {
    margin-top: 0.85rem;
  }

  .nutrition-pulse-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .nutrition-pulse-card {
    padding: 0.9rem;
    border-radius: 1rem;
    border: 1px solid rgba(31, 29, 26, 0.08);
    background: rgba(241, 235, 226, 0.5);
  }

  .nutrition-pulse-card--boost {
    border-color: rgba(184, 126, 42, 0.2);
    background: linear-gradient(180deg, rgba(184, 126, 42, 0.08), rgba(241, 235, 226, 0.6));
  }

  .nutrition-pulse-card--strong {
    border-color: rgba(31, 92, 74, 0.18);
    background: linear-gradient(180deg, rgba(31, 92, 74, 0.08), rgba(241, 235, 226, 0.6));
  }

  .nutrition-pulse-label {
    margin: 0 0 0.35rem;
    color: #6b6258;
    font:
      700 0.78rem/1.2 Manrope,
      system-ui,
      sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .nutrition-guidance-list {
    margin: 0 0 0.9rem;
    padding-left: 1rem;
    display: grid;
    gap: 0.45rem;
    color: #3a352e;
  }
</style>
