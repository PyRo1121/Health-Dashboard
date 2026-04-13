<script lang="ts">
  import { Button, EmptyState, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
  import {
    createSobrietyPageState,
    loadSobrietyPage,
    markSobrietyStatus,
    saveSobrietyCraving,
    saveSobrietyLapse,
  } from '$lib/features/sobriety/client';
  import {
    createSobrietyEventRows,
    formatSobrietyStreak,
    sobrietyStatusActions,
  } from '$lib/features/sobriety/model';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

  let page = $state(createSobrietyPageState());
  let streakLabel = $derived(formatSobrietyStreak(page.summary.streak));
  let todayEventRows = $derived(createSobrietyEventRows(page.summary.todayEvents));

  async function loadSummary() {
    page = await loadSobrietyPage(page);
  }

  async function markStatus(status: 'sober' | 'recovery') {
    const notice = sobrietyStatusActions.find((action) => action.status === status)?.notice ?? '';
    page = await markSobrietyStatus(page, status, notice);
  }

  async function saveCraving() {
    page = await saveSobrietyCraving(page);
  }

  async function saveLapse() {
    page = await saveSobrietyLapse(page);
  }

  onBrowserRouteMount(loadSummary);
</script>

<RoutePageHeader href="/sobriety" />

{#if page.loading}
  <p class="status-copy">Loading sobriety context…</p>
{:else}
  <div class="page-grid sobriety-grid">
    <SectionCard title="Today">
      <p class="status-copy">Current streak: {streakLabel}</p>
      <div class="button-row">
        {#each sobrietyStatusActions as action (action.status)}
          <Button
            variant={action.variant === 'secondary' ? 'secondary' : undefined}
            onclick={() => markStatus(action.status)}
          >
            {action.label}
          </Button>
        {/each}
      </div>
      {#if page.saveNotice}
        <p class="status-copy">{page.saveNotice}</p>
      {/if}
    </SectionCard>

    <SectionCard title="Craving check-in">
      <Field label="Craving score">
        <input
          bind:value={page.cravingScore}
          aria-label="Craving score"
          type="number"
          min="0"
          max="5"
        />
      </Field>
      <Field className="spaced-field" label="Craving note">
        <textarea
          bind:value={page.cravingNote}
          aria-label="Craving note"
          rows="4"
          placeholder="What triggered this? Keep it honest and brief."
        ></textarea>
      </Field>
      <div class="button-row">
        <Button onclick={saveCraving}>Log craving</Button>
      </div>
    </SectionCard>

    <SectionCard title="Lapse context">
      <StatusBanner
        tone="warning"
        title="No shame, just context."
        message="If today was rough, capture what happened and what the next recovery action is."
      />
      <Field className="spaced-field" label="Lapse note">
        <textarea
          bind:value={page.lapseNote}
          aria-label="Lapse note"
          rows="4"
          placeholder="Had a lapse after a rough evening."
        ></textarea>
      </Field>
      <Field className="spaced-field" label="Recovery action">
        <input
          bind:value={page.recoveryAction}
          aria-label="Recovery action"
          placeholder="Text sponsor"
        />
      </Field>
      <div class="button-row">
        <Button variant="secondary" onclick={saveLapse}>Log lapse context</Button>
      </div>
    </SectionCard>

    <SectionCard title="Today’s events">
      {#if todayEventRows.length}
        <ul class="event-list">
          {#each todayEventRows as event (event.id)}
            <li>
              <div>
                <strong>{event.title}</strong>
                {#each event.lines as line (line)}
                  <p>{line}</p>
                {/each}
              </div>
              {#if event.badge}
                <span class="value-chip">{event.badge}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState
          title="No sobriety events logged for today."
          message="Start with one honest status update, then log cravings or recovery context if needed."
        />
      {/if}
    </SectionCard>
  </div>
{/if}

<style>
  @media (max-width: 639px) {
    .event-list {
      gap: 0.6rem;
    }

    .event-list :global(li) {
      padding-bottom: 0.65rem;
    }
  }

  @media (min-width: 960px) {
    .sobriety-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
