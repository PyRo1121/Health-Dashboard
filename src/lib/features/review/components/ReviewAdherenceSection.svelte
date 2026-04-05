<script lang="ts">
  import { SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewAdherenceCard } from '$lib/features/review/model';

  let {
    adherenceCards,
  }: {
    adherenceCards: ReviewAdherenceCard[];
  } = $props();
</script>

<SectionCard title="Actual adherence">
  {#if adherenceCards.length}
    <div class="review-adherence-cards">
      {#each adherenceCards as card (card.label)}
        <article class={`review-adherence-card review-adherence-card--${card.tone}`}>
          <span class="review-adherence-label">{card.label}</span>
          <strong class="review-adherence-value">{card.value}</strong>
          <p>{card.detail}</p>
        </article>
      {/each}
    </div>
  {:else}
    <p class="status-copy">Build a weekly plan before Review can score actual adherence.</p>
  {/if}
</SectionCard>

<style>
  .review-adherence-cards {
    display: grid;
    gap: 0.9rem;
  }

  .review-adherence-card {
    display: grid;
    gap: 0.3rem;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid rgba(58, 53, 46, 0.12);
    background: linear-gradient(
      180deg,
      rgba(251, 248, 243, 0.96) 0%,
      rgba(241, 235, 226, 0.72) 100%
    );
  }

  .review-adherence-card p {
    margin: 0;
    color: #3a352e;
  }

  .review-adherence-card--steady {
    border-color: rgba(31, 92, 74, 0.22);
    background: linear-gradient(180deg, rgba(31, 92, 74, 0.08) 0%, rgba(241, 235, 226, 0.72) 100%);
  }

  .review-adherence-card--mixed {
    border-color: rgba(151, 94, 32, 0.22);
    background: linear-gradient(180deg, rgba(151, 94, 32, 0.08) 0%, rgba(241, 235, 226, 0.72) 100%);
  }

  .review-adherence-card--attention {
    border-color: rgba(148, 59, 47, 0.22);
    background: linear-gradient(180deg, rgba(148, 59, 47, 0.08) 0%, rgba(241, 235, 226, 0.72) 100%);
  }

  .review-adherence-label {
    font:
      700 0.78rem/1 Manrope,
      system-ui,
      sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #5a544c;
  }

  .review-adherence-value {
    font:
      600 1.9rem/1 Newsreader,
      Georgia,
      serif;
    color: #241f1a;
  }

  @media (min-width: 960px) {
    .review-adherence-cards {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
