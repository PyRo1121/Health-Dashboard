<script lang="ts">
  import { resolve } from '$app/paths';
  import { SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewWeeklyRecommendationView } from '$lib/features/review/model';

  let {
    headline,
    daysTracked,
    recommendation,
  }: {
    headline: string;
    daysTracked: number;
    recommendation: ReviewWeeklyRecommendationView;
  } = $props();
</script>

<SectionCard title="Weekly headline">
  <h3 class="card-headline">{headline}</h3>
  <p class="status-copy">Tracked days: {daysTracked}</p>

  {#if recommendation}
    <div class="review-recommendation-hero">
      <span class="review-recommendation-badge">{recommendation.badge}</span>
      <h4 class="review-recommendation-title">
        This week’s recommendation: {recommendation.title}
      </h4>
      <p class="status-copy">{recommendation.summary}</p>
      <p class="status-copy">
        <strong>{recommendation.confidenceLabel}</strong> · {recommendation.expectedImpact}
      </p>
      <ul class="recommendation-list">
        {#each recommendation.provenance as line (line)}
          <li>Evidence: {line}</li>
        {/each}
      </ul>
      <a
        class="review-recommendation-link"
        href={recommendation.href.startsWith('/nutrition?')
          ? `${resolve('/nutrition')}${recommendation.href.slice('/nutrition'.length)}`
          : resolve('/plan')}>{recommendation.actionLabel}</a
      >
    </div>
  {/if}
</SectionCard>

<style>
  .card-headline {
    margin: 0;
    font:
      500 2rem/1.05 Newsreader,
      Georgia,
      serif;
  }

  .review-recommendation-hero {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(31, 29, 26, 0.08);
    display: grid;
    gap: 0.6rem;
  }

  .review-recommendation-badge {
    display: inline-flex;
    width: fit-content;
    padding: 0.28rem 0.6rem;
    border-radius: 999px;
    background: rgba(31, 92, 74, 0.12);
    color: #1f5c4a;
    font:
      700 0.75rem/1 Manrope,
      system-ui,
      sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .review-recommendation-title {
    margin: 0;
    font:
      700 1.1rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  .recommendation-list {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.4rem;
  }

  .review-recommendation-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-height: 44px;
    padding: 0.75rem 1rem;
    border-radius: 999px;
    background: #1f5c4a;
    color: #fbf8f3;
    font:
      600 0.95rem/1 Manrope,
      system-ui,
      sans-serif;
    text-decoration: none;
  }
</style>
