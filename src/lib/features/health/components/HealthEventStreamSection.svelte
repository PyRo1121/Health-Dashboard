<script lang="ts">
  import { toSafeExternalHref } from '$lib/core/shared/external-links';
  import { EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { HealthEventRow } from '$lib/features/health/model';

  let {
    eventRows,
  }: {
    eventRows: HealthEventRow[];
  } = $props();
</script>

<SectionCard title="Today’s health stream">
  {#if eventRows.length}
    <ul class="event-list">
      {#each eventRows as event (event.id)}
        <li>
          <div>
            <strong>{event.title}</strong>
            {#each event.lines as line (line)}
              <p>{line}</p>
            {/each}
            {#if toSafeExternalHref(event.referenceUrl)}
              <p>
                <a
                  class="status-copy"
                  href={toSafeExternalHref(event.referenceUrl) ?? undefined}
                  target="_blank"
                  rel="external noreferrer"
                  aria-label={`Learn more about logged medication ${event.title}`}
                >
                  Learn more
                </a>
              </p>
            {/if}
            <p class="status-copy event-meta">{event.meta}</p>
          </div>
          {#if event.badge}
            <span class="event-badge">{event.badge}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No health events logged yet."
      message="Start with a symptom, anxiety episode, sleep note, or quick-log template."
    />
  {/if}
</SectionCard>

<style>
  .event-list {
    gap: 0.85rem;
  }

  .event-list :global(li) {
    padding-bottom: 0.85rem;
  }

  .event-meta {
    margin-top: 0.5rem;
  }

  .event-badge {
    white-space: nowrap;
    align-self: start;
    padding: 0.3rem 0.6rem;
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(233, 195, 73, 0.12);
    color: var(--phc-label);
    font: 600 0.8rem/1 var(--phc-font-ui);
  }
</style>
