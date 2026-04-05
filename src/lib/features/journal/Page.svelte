<script lang="ts">
  import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
  import {
    beginJournalSave,
    createJournalPageState,
    deleteJournalPageEntry,
    loadJournalPage,
    saveJournalPage,
  } from '$lib/features/journal/client';
  import { createJournalEntryRows, journalEntryTypeOptions } from '$lib/features/journal/model';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

  let page = $state(createJournalPageState());
  let canSave = $derived(Boolean(page.draft.body.trim()));
  let entryRows = $derived(createJournalEntryRows(page.entries));

  async function loadEntries() {
    page = await loadJournalPage(page);
  }

  async function handleSave() {
    page = beginJournalSave(page);
    page = await saveJournalPage(page);
  }

  async function handleDelete(id: string) {
    page = await deleteJournalPageEntry(page, id);
  }

  onBrowserRouteMount(loadEntries);
</script>

<RoutePageHeader href="/journal" />

{#if page.loading}
  <p class="status-copy">Loading today’s journal…</p>
{:else}
  <div class="page-grid journal-grid">
    <SectionCard title="Writing surface">
      <div class="form-row">
        <Field label="Entry type">
          <select bind:value={page.draft.entryType} aria-label="Entry type">
            {#each journalEntryTypeOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </Field>

        <Field label="Title">
          <input bind:value={page.draft.title} aria-label="Title" placeholder="Morning check-in" />
        </Field>
      </div>

      <Field className="body-field" label="Body">
        <textarea
          bind:value={page.draft.body}
          aria-label="Body"
          rows="8"
          placeholder="Write what happened, what mattered, or what changed."
        ></textarea>
      </Field>

      <Button onclick={handleSave} disabled={page.saving || !canSave}>
        {page.saving ? 'Saving…' : 'Save entry'}
      </Button>

      {#if page.saveNotice}
        <p class="status-copy">{page.saveNotice}</p>
      {/if}
    </SectionCard>

    <SectionCard title="Today">
      <p class="status-copy">Working day: {page.localDay}</p>

      {#if entryRows.length}
        <ul class="entry-list">
          {#each entryRows as entry (entry.id)}
            <li>
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.body}</p>
              </div>
              <Button variant="ghost" onclick={() => handleDelete(entry.id)}>Delete</Button>
            </li>
          {/each}
        </ul>
      {:else}
        <EmptyState
          title="Nothing written yet today."
          message="Start with one sentence about what mattered, then add more if you want."
        />
      {/if}
    </SectionCard>
  </div>
{/if}

<style>
  .entry-list li {
    padding-bottom: 0.85rem;
    border-bottom: 1px solid rgba(31, 29, 26, 0.08);
  }

  .entry-list strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  .entry-list p {
    margin: 0;
    color: #3a352e;
  }

  @media (min-width: 960px) {
    .journal-grid {
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
    }
  }
</style>
