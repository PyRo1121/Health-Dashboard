<script lang="ts">
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { TodayNutritionPulseMetric } from '$lib/features/today/model';
  import type { TodaySnapshot } from '$lib/features/today/service';

  let {
    snapshot,
    todayNutritionPulseMetrics,
    todayNutritionGuidance,
    todayNutritionRows,
    plannedMealProjectionRows,
    onRecoveryAction,
  }: {
    snapshot: TodaySnapshot | null;
    todayNutritionPulseMetrics: TodayNutritionPulseMetric[];
    todayNutritionGuidance: string[];
    todayNutritionRows: string[];
    plannedMealProjectionRows: string[];
    onRecoveryAction: (
      actionId:
        | 'skip-workout'
        | 'clear-planned-meal'
        | 'apply-recovery-meal'
        | 'apply-recovery-workout'
    ) => void;
  } = $props();
</script>

{#if snapshot?.recoveryAdaptation}
  <SectionCard title="Recovery today">
    <p class="recovery-headline">{snapshot.recoveryAdaptation.headline}</p>
    <ul class="nutrition-guidance-list">
      {#each snapshot.recoveryAdaptation.reasons as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
    <ul class="summary-list">
      {#each snapshot.recoveryAdaptation.mealFallback as line (line)}
        <li>{line}</li>
      {/each}
      {#each snapshot.recoveryAdaptation.workoutFallback as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
    {#if snapshot.recoveryAdaptation.mealRecommendation}
      <div class="recovery-recommendation">
        <strong>{snapshot.recoveryAdaptation.mealRecommendation.title}</strong>
        <p class="status-copy">{snapshot.recoveryAdaptation.mealRecommendation.subtitle}</p>
        <ul class="summary-list compact-list">
          {#each snapshot.recoveryAdaptation.mealRecommendation.reasons as line (line)}
            <li>{line}</li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if snapshot.recoveryAdaptation.workoutRecommendation}
      <div class="recovery-recommendation">
        <strong>{snapshot.recoveryAdaptation.workoutRecommendation.title}</strong>
        <p class="status-copy">{snapshot.recoveryAdaptation.workoutRecommendation.subtitle}</p>
        <ul class="summary-list compact-list">
          {#each snapshot.recoveryAdaptation.workoutRecommendation.reasons as line (line)}
            <li>{line}</li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if snapshot.recoveryAdaptation.actions.length}
      <div class="recovery-actions">
        {#each snapshot.recoveryAdaptation.actions as action (action.id)}
          <button class="recovery-action-button" onclick={() => onRecoveryAction(action.id)}>
            {action.label}
          </button>
        {/each}
      </div>
    {/if}
  </SectionCard>
{/if}

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
  .recovery-headline {
    margin: 0 0 0.75rem;
    color: #6b3d2b;
    font-weight: 700;
  }

  .recovery-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.9rem;
  }

  .recovery-recommendation {
    margin-top: 0.9rem;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(31, 29, 26, 0.08);
  }

  .compact-list {
    margin-top: 0.45rem;
  }

  .recovery-action-button {
    border: 1px solid rgba(107, 61, 43, 0.18);
    background: rgba(255, 247, 241, 0.9);
    color: #3f2a1f;
    border-radius: 999px;
    padding: 0.55rem 0.9rem;
    font:
      700 0.9rem/1 Manrope,
      system-ui,
      sans-serif;
    cursor: pointer;
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
