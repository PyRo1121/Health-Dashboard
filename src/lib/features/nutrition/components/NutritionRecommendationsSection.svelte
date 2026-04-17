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
    onPlanRecommendation: (id: string, kind: 'food' | 'recipe', canPlanDirectly: boolean) => void;
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
            <p>{recommendation.subtitle}</p>
            <p>Source: {recommendation.sourceName}</p>
            <p>Posture: {recommendation.sourcePosture}</p>
            <p class="recommendation-meta">
              <span class="recommendation-score score-chip">{recommendation.score}</span>
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
              onclick={() =>
                onPlanRecommendation(
                  recommendation.id,
                  recommendation.kind,
                  recommendation.canPlanDirectly
                )}
              disabled={!recommendation.canPlanDirectly}
            >
              {recommendation.canPlanDirectly ? 'Plan next' : 'Review first'}
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
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(10, 60, 45, 0.18);
    color: var(--phc-text);
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
    border-bottom: 0.5px solid var(--phc-border-soft);
  }

  .recommendation-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .recommendation-score {
    flex-shrink: 0;
  }

  .recommendation-actions {
    display: grid;
    gap: 0.6rem;
    justify-items: end;
  }
</style>
