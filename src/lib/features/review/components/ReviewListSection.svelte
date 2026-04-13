<script lang="ts">
  import { resolve } from '$app/paths';
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewSection } from '$lib/features/review/model';

  let {
    section,
  }: {
    section: ReviewSection;
  } = $props();
</script>

<SectionCard
  title={section.title}
  titleClass={section.emphasis === 'strategy' ? 'card-title review-strategy-title' : 'card-title'}
>
  {#if section.items.length}
    <ul class:review-strategy-list={section.emphasis === 'strategy'} class="summary-list">
      {#each section.items as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
  {:else if section.emptyTitle}
    <EmptyState title={section.emptyTitle} message={section.emptyMessage ?? ''} />
  {:else}
    <p class="status-copy">{section.emptyMessage}</p>
  {/if}
  {#if section.actionHref && section.actionLabel}
    <div class="section-action">
      <a class="section-link action-link" href={resolve(section.actionHref)}
        >{section.actionLabel}</a
      >
    </div>
  {/if}
</SectionCard>

<style>
  :global(.review-strategy-title) {
    color: var(--phc-label);
  }

  .review-strategy-list {
    gap: 0.9rem;
  }

  .review-strategy-list li {
    padding: 0.9rem 1rem;
    border: 0.5px solid rgba(233, 195, 73, 0.12);
    background: rgba(10, 60, 45, 0.22);
  }

  .section-action {
    margin-top: 1rem;
  }

  .section-link {
    width: fit-content;
  }

  @media (max-width: 639px) {
    .review-strategy-list {
      gap: 0.7rem;
    }

    .review-strategy-list li {
      padding: 0.75rem 0.85rem;
    }

    .section-link {
      width: 100%;
    }
  }
</style>
