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
    <div class="review-adherence-audit">
      {#each auditItems as item (`${item.badge}-${item.title}-${item.detail}`)}
        <article class={`review-adherence-audit-item review-adherence-audit-item--${item.tone}`}>
          <span class="review-adherence-audit-badge">{item.badge}</span>
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

  .review-adherence-audit {
    display: grid;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .review-adherence-audit-item {
    display: grid;
    gap: 0.25rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(58, 53, 46, 0.08);
  }

  .review-adherence-audit-item p {
    margin: 0;
    color: #3a352e;
  }

  .review-adherence-audit-badge {
    width: fit-content;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font:
      700 0.72rem/1 Manrope,
      system-ui,
      sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: rgba(31, 92, 74, 0.08);
    color: #1f5c4a;
  }

  .review-adherence-audit-item--attention .review-adherence-audit-badge {
    background: rgba(148, 59, 47, 0.08);
    color: #943b2f;
  }

  .review-adherence-audit-item--mixed .review-adherence-audit-badge {
    background: rgba(151, 94, 32, 0.08);
    color: #975e20;
  }
</style>
