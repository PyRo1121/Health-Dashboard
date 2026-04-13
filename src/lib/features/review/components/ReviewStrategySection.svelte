<script lang="ts">
  import { resolve } from '$app/paths';
  import { SectionCard } from '$lib/core/ui/primitives';
  import {
    resolveReviewNavigationHref,
    type ReviewDecisionCardView,
  } from '$lib/features/review/model';

  let {
    cards,
    emptyMessage,
  }: {
    cards: ReviewDecisionCardView[];
    emptyMessage: string;
  } = $props();

  function decisionTone(badge: ReviewDecisionCardView['badge']): string {
    return badge.toLowerCase();
  }
</script>

<SectionCard title="Decision engine actions" titleClass="card-title review-strategy-title">
  {#if cards.length}
    <div class="review-strategy-cards">
      {#each cards as card (`${card.badge}:${card.title}:${card.href}`)}
        <article
          class={`review-strategy-card review-strategy-card--${decisionTone(card.badge)} ${
            decisionTone(card.badge) === 'adjust'
              ? 'surface-tone--accent'
              : decisionTone(card.badge) === 'stop'
                ? 'surface-tone--warning'
                : ''
          }`}
        >
          <div class="review-strategy-copy">
            <div class="review-strategy-header">
              <span
                class={`review-strategy-badge badge-chip review-strategy-badge--${decisionTone(card.badge)}`}
                >{card.badge}</span
              >
              <p class="review-strategy-eyebrow">Next-week call</p>
            </div>
            <strong>{card.title}</strong>
            <p>{card.detail}</p>
            <p class="review-strategy-meta">
              <strong>{card.confidenceLabel}</strong> · {card.expectedImpact}
            </p>
            {#if card.provenance.length}
              <ul class="review-strategy-provenance">
                {#each card.provenance as line, index (`${card.title}:${index}:${line}`)}
                  <li>{line}</li>
                {/each}
              </ul>
            {/if}
          </div>
          <a class="review-strategy-link" href={resolveReviewNavigationHref(card.href, resolve)}
            >{card.actionLabel}</a
          >
        </article>
      {/each}
    </div>
  {:else}
    <p class="status-copy">{emptyMessage}</p>
  {/if}
</SectionCard>

<style>
  :global(.review-strategy-title) {
    color: var(--phc-label);
  }

  .review-strategy-cards {
    display: grid;
    gap: 1rem;
  }

  .review-strategy-card {
    display: grid;
    gap: 0.95rem;
    padding: 1rem;
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(10, 60, 45, 0.16);
  }

  .review-strategy-card--adjust {
    border-color: rgba(233, 195, 73, 0.2);
  }

  .review-strategy-card--stop {
    border-color: rgba(255, 180, 171, 0.2);
  }

  .review-strategy-copy {
    display: grid;
    gap: 0.45rem;
  }

  .review-strategy-header {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .review-strategy-eyebrow {
    margin: 0;
    color: var(--phc-muted);
    font: 700 0.72rem/1.2 var(--phc-font-ui);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .review-strategy-copy strong {
    color: var(--phc-text);
    font: 500 1.15rem/1.15 var(--phc-font-display);
  }

  .review-strategy-copy p {
    margin: 0;
    color: var(--phc-text);
  }

  .review-strategy-meta {
    color: var(--phc-muted);
    font: 500 0.92rem/1.45 var(--phc-font-ui);
  }

  .review-strategy-provenance {
    margin: 0;
    padding-left: 1rem;
    display: grid;
    gap: 0.3rem;
    color: var(--phc-text);
  }

  .review-strategy-badge {
    background: rgba(10, 60, 45, 0.24);
    font-size: 0.74rem;
    letter-spacing: 0.14em;
  }

  .review-strategy-badge--adjust {
    background: rgba(233, 195, 73, 0.12);
  }

  .review-strategy-badge--stop {
    background: rgba(181, 84, 60, 0.14);
  }

  .review-strategy-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-height: 44px;
    padding: 0.75rem 1rem;
    background: var(--phc-label);
    color: #3c2f00;
    font: 700 0.78rem/1 var(--phc-font-ui);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    text-decoration: none;
  }
</style>
