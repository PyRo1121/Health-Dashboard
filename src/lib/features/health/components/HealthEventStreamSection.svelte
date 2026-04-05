<script lang="ts">
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
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.85rem;
  }

  .event-list li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid rgba(31, 29, 26, 0.08);
  }

  .event-list p {
    margin: 0.25rem 0 0;
    color: #3a352e;
  }

  .event-meta {
    margin-top: 0.5rem;
  }

  .event-badge {
    white-space: nowrap;
    align-self: start;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: #f1ebe2;
    font:
      600 0.8rem/1 Manrope,
      system-ui,
      sans-serif;
  }
</style>
