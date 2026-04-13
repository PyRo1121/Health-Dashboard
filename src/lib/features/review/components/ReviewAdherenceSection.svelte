<script lang="ts">
  import { SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewAdherenceAuditItem, ReviewAdherenceCard } from '$lib/features/review/model';

  let {
    adherenceCards,
    auditItems,
  }: {
    adherenceCards: ReviewAdherenceCard[];
    auditItems: ReviewAdherenceAuditItem[];
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

  {#if auditItems.length}
    <div class="review-adherence-audit divider-block">
      {#each auditItems as item (`${item.badge}-${item.title}-${item.detail}`)}
        <article class={`review-adherence-audit-item review-adherence-audit-item--${item.tone}`}>
          <span
            class={`review-adherence-audit-badge badge-chip review-adherence-audit-badge--${item.tone}`}
            >{item.badge}</span
          >
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  {/if}
</SectionCard>

<style>
  .review-adherence-cards {
    display: grid;
    gap: 1rem;
  }

  .review-adherence-card {
    display: grid;
    gap: 0.45rem;
    padding: 1rem;
    border: 0.5px solid transparent;
    background: rgba(10, 60, 45, 0.16);
  }

  .review-adherence-card p {
    margin: 0;
    color: var(--phc-muted);
  }

  .review-adherence-card--steady {
    border-color: rgba(233, 195, 73, 0.18);
  }

  .review-adherence-card--mixed {
    border-color: rgba(188, 237, 215, 0.18);
  }

  .review-adherence-card--attention {
    border-color: rgba(255, 180, 171, 0.2);
  }

  .review-adherence-label {
    font: 600 0.68rem/1 var(--phc-font-ui);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--phc-label);
  }

  .review-adherence-value {
    font: 500 2.15rem/0.95 var(--phc-font-display);
    color: var(--phc-text);
    font-style: italic;
  }

  @media (min-width: 960px) {
    .review-adherence-cards {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 639px) {
    .review-adherence-cards {
      gap: 0.8rem;
    }

    .review-adherence-card {
      gap: 0.35rem;
      padding: 0.85rem;
    }

    .review-adherence-value {
      font-size: 1.85rem;
    }

    .review-adherence-audit {
      gap: 0.6rem;
    }
  }

  .review-adherence-audit {
    display: grid;
    gap: 0.75rem;
  }

  .review-adherence-audit-item {
    display: grid;
    gap: 0.35rem;
  }

  .review-adherence-audit-item strong {
    color: var(--phc-text);
  }

  .review-adherence-audit-item p {
    margin: 0;
    color: var(--phc-muted);
  }

  .review-adherence-audit-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.68rem;
  }

  .review-adherence-audit-badge--attention {
    background: rgba(255, 180, 171, 0.12);
  }

  .review-adherence-audit-badge--mixed {
    background: rgba(160, 209, 188, 0.12);
  }
</style>
