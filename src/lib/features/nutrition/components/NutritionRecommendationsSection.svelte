<script lang="ts">
  import { Button, SectionCard } from '$lib/core/ui/primitives';
  import { type NutritionRecommendation } from '$lib/features/nutrition/recommend';
  import { createRecommendationSummary } from '$lib/features/nutrition/model';

  let {
    recommendationContextRows,
    recommendations,
    onUseRecommendation,
    onPlanRecommendation,
  }: {
    recommendationContextRows: string[];
    recommendations: NutritionRecommendation[];
    onUseRecommendation: (id: string, kind: 'food' | 'recipe') => void;
    onPlanRecommendation: (id: string, kind: 'food' | 'recipe') => void;
  } = $props();
</script>

<SectionCard title="Recommended next">
  <ul class="recommendation-context">
    {#each recommendationContextRows as row (row)}
      <li>{row}</li>
    {/each}
  </ul>

  {#if recommendations.length}
    <ul class="recommendation-list">
      {#each recommendations as recommendation (recommendation.id)}
        <li>
          <div>
            <strong>{recommendation.title}</strong>
            <p class="recommendation-meta">
              <span class="recommendation-score">{recommendation.score}</span>
              <span>{createRecommendationSummary(recommendation)}</span>
            </p>
            {#each recommendation.reasons as reason (reason)}
              <p>{reason}</p>
            {/each}
          </div>
          <div class="recommendation-actions">
            <Button
              variant="ghost"
              onclick={() => onUseRecommendation(recommendation.id, recommendation.kind)}
            >
              {recommendation.kind === 'food' ? 'Load food' : 'Load recipe'}
            </Button>
            <Button
              variant="secondary"
              onclick={() => onPlanRecommendation(recommendation.id, recommendation.kind)}
            >
              Plan next
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="status-copy">
      Recommendations will appear once foods or recipes exist in your local catalog.
    </p>
  {/if}
</SectionCard>

<style>
  .recommendation-context {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.5rem;
  }

  .recommendation-context li {
    padding: 0.6rem 0.75rem;
    border: 1px solid rgba(31, 29, 26, 0.08);
    border-radius: 0.85rem;
    background: rgba(241, 235, 226, 0.55);
    color: #3a352e;
    font: 500 0.88rem/1.35 var(--phc-font-ui);
  }

  .recommendation-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.9rem;
  }

  .recommendation-list li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 0 1rem;
    border-bottom: 1px solid rgba(31, 29, 26, 0.08);
  }

  .recommendation-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .recommendation-score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    min-height: 2.25rem;
    padding: 0 0.5rem;
    border-radius: 999px;
    background: #1f5c4a;
    color: #fbf8f3;
    font: 700 0.9rem/1 var(--phc-font-ui);
  }

  .recommendation-actions {
    display: grid;
    gap: 0.6rem;
    justify-items: end;
  }
</style>
