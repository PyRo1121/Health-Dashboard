<script lang="ts">
  import { resolve } from '$app/paths';
  import { SectionCard } from '$lib/core/ui/primitives';
  import {
    resolveReviewNavigationHref,
    type ReviewNavigationHref,
    type ReviewWeeklyRecommendationView,
  } from '$lib/features/review/model';

  let {
    headline,
    daysTracked,
    recommendation,
  }: {
    headline: string;
    daysTracked: number;
    recommendation: ReviewWeeklyRecommendationView;
  } = $props();

  function describeRecommendationEvidence(line: string, index: number): string {
    if (index === 0) return `Primary signal: ${line}`;
    if (index === 1) return `Supporting signal: ${line}`;
    return `Additional signal ${index + 1}: ${line}`;
  }

  function recommendationTone(badge: NonNullable<ReviewWeeklyRecommendationView>['badge']): string {
    return badge.toLowerCase();
  }
</script>

<SectionCard title="Weekly headline">
  <h3 class="card-headline">{headline}</h3>
  <p class="status-copy">Tracked days: {daysTracked}</p>

  {#if recommendation}
    <div class="review-recommendation-hero">
      <div class="review-recommendation-header">
        <div class="review-recommendation-copy">
          <p class="review-recommendation-eyebrow eyebrow-label">Local-first recommendation</p>
          <h4 class="review-recommendation-title">{recommendation.title}</h4>
        </div>
        <span
          class={`review-recommendation-badge badge-chip review-recommendation-badge--${recommendationTone(
            recommendation.badge
          )}`}>{recommendation.badge}</span
        >
      </div>
      <p class="status-copy">{recommendation.summary}</p>
      <div class="review-recommendation-metrics">
        <p class="status-copy">
          <strong>{recommendation.confidenceLabel}</strong>
        </p>
        <p class="status-copy">{recommendation.expectedImpact}</p>
      </div>
      <p class="review-recommendation-trust">
        Based on the records you logged this week. Nothing here depends on a remote profile.
      </p>
      {#if recommendation.provenance.length}
        <div class="review-recommendation-evidence">
          <p class="review-recommendation-evidence-label caps-label">
            Why it earned the slot from your own logs
          </p>
          <ul class="recommendation-list">
            {#each recommendation.provenance as line, index (`${index}:${line}`)}
              <li>{describeRecommendationEvidence(line, index)}</li>
            {/each}
          </ul>
        </div>
      {/if}
      <a
        class="review-recommendation-link action-link"
        href={resolveReviewNavigationHref(recommendation.href, resolve)}
        >{recommendation.actionLabel}</a
      >
    </div>
  {/if}
</SectionCard>

<style>
  .card-headline {
    margin: 0;
    font: 500 clamp(2.75rem, 6vw, 5rem) / 0.95 var(--phc-font-display);
    color: var(--phc-text);
    font-style: italic;
    letter-spacing: -0.03em;
  }

  .review-recommendation-hero {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 0.5px solid var(--phc-border-soft);
    display: grid;
    gap: 1rem;
  }

  .review-recommendation-header {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    justify-content: space-between;
  }

  .review-recommendation-copy {
    display: grid;
    gap: 0.35rem;
  }

  .review-recommendation-eyebrow {
    margin: 0;
  }

  .review-recommendation-badge {
    background: rgba(233, 195, 73, 0.14);
  }

  .review-recommendation-badge--adjust {
    background: rgba(160, 209, 188, 0.12);
  }

  .review-recommendation-badge--stop {
    background: rgba(255, 180, 171, 0.12);
  }

  .review-recommendation-title {
    margin: 0;
    font: 500 1.45rem/1.05 var(--phc-font-display);
    color: var(--phc-text);
    font-style: italic;
  }

  .review-recommendation-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 1rem;
  }

  .review-recommendation-metrics p {
    margin: 0;
  }

  .review-recommendation-trust {
    margin: 0;
    color: var(--phc-muted);
    font: 500 0.82rem/1.55 var(--phc-font-ui);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .review-recommendation-evidence {
    display: grid;
    gap: 0.45rem;
  }

  .review-recommendation-evidence-label {
    margin: 0;
    color: var(--phc-label);
    font-size: 0.72rem;
    line-height: 1.3;
    letter-spacing: 0.18em;
  }

  .recommendation-list {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.4rem;
    color: var(--phc-text);
  }

  @media (max-width: 639px) {
    .card-headline {
      font-size: clamp(2.15rem, 12vw, 2.8rem);
    }

    .review-recommendation-hero {
      margin-top: 1.1rem;
      padding-top: 1.1rem;
      gap: 0.8rem;
    }

    .review-recommendation-header {
      flex-direction: column;
      gap: 0.55rem;
    }

    .review-recommendation-title {
      font-size: 1.25rem;
    }

    .review-recommendation-metrics {
      gap: 0.35rem 0.75rem;
    }

    .review-recommendation-trust {
      letter-spacing: 0.05em;
      font-size: 0.76rem;
      line-height: 1.45;
    }

    .recommendation-list {
      gap: 0.3rem;
    }
  }

  .review-recommendation-link {
    width: fit-content;
  }

  @media (max-width: 639px) {
    .review-recommendation-link {
      width: 100%;
    }
  }
</style>
