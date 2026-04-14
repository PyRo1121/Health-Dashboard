<script lang="ts">
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { TodayNutritionPulseMetric } from '$lib/features/today/model';
  import type { TodaySnapshot } from '$lib/features/today/snapshot';

  let {
    snapshot,
    todayNutritionPulseMetrics,
    todayNutritionGuidance,
    todayNutritionRows,
    plannedMealProjectionRows,
  }: {
    snapshot: TodaySnapshot | null;
    todayNutritionPulseMetrics: TodayNutritionPulseMetric[];
    todayNutritionGuidance: string[];
    todayNutritionRows: string[];
    plannedMealProjectionRows: string[];
  } = $props();
</script>

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

<style>
  .nutrition-pulse-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  .nutrition-pulse-card {
    padding: 0.9rem;
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(10, 60, 45, 0.18);
  }

  .nutrition-pulse-card--boost {
    border-color: rgba(233, 195, 73, 0.18);
    background: rgba(233, 195, 73, 0.08);
  }

  .nutrition-pulse-card--strong {
    border-color: rgba(147, 195, 174, 0.18);
    background: rgba(147, 195, 174, 0.08);
  }

  .nutrition-pulse-label {
    margin: 0 0 0.35rem;
    color: var(--phc-muted);
    letter-spacing: 0.04em;
  }

  .nutrition-guidance-list {
    margin: 0 0 0.9rem;
    padding-left: 1rem;
    display: grid;
    gap: 0.45rem;
    color: var(--phc-text);
  }
</style>
