<script lang="ts">
  import { resolve } from '$app/paths';
  import { toSafeExternalHref } from '$lib/core/shared/external-links';
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { ReviewReferenceItem, ReviewSection } from '$lib/features/review/model';

  let {
    section,
  }: {
    section: ReviewSection;
  } = $props();

  function isLinkItem(
    item: ReviewSection['items'][number]
  ): item is ReviewReferenceItem {
    return (
      typeof item === 'object' &&
      item !== null &&
      'label' in item &&
      'href' in item &&
      'categoryLabel' in item &&
      'kind' in item
    );
  }

  function isSafeLinkItem(item: ReviewSection['items'][number]): item is ReviewReferenceItem {
    return isLinkItem(item) && Boolean(toSafeExternalHref(item.href));
  }
</script>

<SectionCard
  title={section.title}
  titleClass={section.emphasis === 'strategy' ? 'card-title review-strategy-title' : 'card-title'}
>
  {#if section.items.length}
    <ul class:review-strategy-list={section.emphasis === 'strategy'} class="summary-list">
      {#each section.items as item, index (`${typeof item === 'string' ? item : item.href}:${index}`)}
        <li>
          {#if isSafeLinkItem(item)}
            <div class="reference-link-row">
              {#if item.categoryLabel}
                <span
                  class:reference-pill--medication={item.kind === 'medication'}
                  class:reference-pill--symptom={item.kind === 'symptom'}
                  class="reference-pill"
                >
                  {item.categoryLabel}
                </span>
              {/if}
              <a
                href={toSafeExternalHref(item.href) ?? undefined}
                target="_blank"
                rel="noreferrer"
                aria-label={`${item.categoryLabel} reference ${item.label} opens in new tab`}
              >
                {item.label}
              </a>
              <span class="external-link-hint" aria-hidden="true">Opens externally</span>
            </div>
          {:else if isLinkItem(item)}
            {item.label}
          {:else}
            {item}
          {/if}
        </li>
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

  .reference-link-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
  }

  .reference-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 0.5px solid rgba(233, 195, 73, 0.2);
    background: rgba(233, 195, 73, 0.1);
    color: var(--phc-label);
    font-size: 0.78rem;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }

  .reference-pill--medication {
    border-color: rgba(73, 147, 233, 0.28);
    background: rgba(73, 147, 233, 0.14);
  }

  .reference-pill--symptom {
    border-color: rgba(233, 116, 73, 0.28);
    background: rgba(233, 116, 73, 0.14);
  }

  .external-link-hint {
    color: var(--phc-muted);
    font-size: 0.8rem;
    white-space: nowrap;
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
