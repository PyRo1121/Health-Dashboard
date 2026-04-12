<script lang="ts">
  import { resolve } from '$app/paths';
  import { SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewDecisionCardView } from '$lib/features/review/model';

  let {
    cards,
    emptyMessage,
  }: {
    cards: ReviewDecisionCardView[];
    emptyMessage: string;
  } = $props();
</script>

<SectionCard
  title="Continue / adjust / stop next week"
  titleClass="card-title review-strategy-title"
>
  {#if cards.length}
    <div class="review-strategy-cards">
      {#each cards as card (card.href)}
        <article class="review-strategy-card">
          <div class="review-strategy-copy">
            <span class="review-strategy-badge">{card.badge}</span>
            <strong>{card.title}</strong>
            <p>{card.detail}</p>
          </div>
          <a
            class="review-strategy-link"
            href={card.href.startsWith('/nutrition?')
              ? `${resolve('/nutrition')}${card.href.slice('/nutrition'.length)}`
              : resolve('/plan')}>{card.actionLabel}</a
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
    color: #1f5c4a;
  }

  .review-strategy-cards {
    display: grid;
    gap: 0.9rem;
  }

  .review-strategy-card {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border: 1px solid rgba(31, 92, 74, 0.12);
    border-radius: 1rem;
    background: linear-gradient(180deg, rgba(31, 92, 74, 0.06) 0%, rgba(241, 235, 226, 0.72) 100%);
  }

  .review-strategy-copy {
    display: grid;
    gap: 0.4rem;
  }

  .review-strategy-copy p {
    margin: 0;
    color: #3a352e;
  }

  .review-strategy-badge {
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

  .review-strategy-link {
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
