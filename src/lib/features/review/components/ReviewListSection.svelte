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
      <a class="section-link" href={resolve(section.actionHref)}>{section.actionLabel}</a>
    </div>
  {/if}
</SectionCard>

<style>
  :global(.review-strategy-title) {
    color: #1f5c4a;
  }

  .review-strategy-list {
    gap: 0.9rem;
  }

  .review-strategy-list li {
    padding: 0.85rem 0.95rem;
    border: 1px solid rgba(31, 92, 74, 0.12);
    border-radius: 1rem;
    background: linear-gradient(180deg, rgba(31, 92, 74, 0.06) 0%, rgba(241, 235, 226, 0.6) 100%);
  }

  .section-action {
    margin-top: 0.85rem;
  }

  .section-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
