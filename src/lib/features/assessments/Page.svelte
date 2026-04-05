<script lang="ts">
  import { Button, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
  import {
    createAssessmentsPageState,
    loadAssessmentsPage,
    saveAssessmentsProgressPage,
    setAssessmentsInstrument,
    submitAssessmentsPage,
  } from '$lib/features/assessments/client';
  import {
    assessmentInstrumentOptions,
    createAssessmentResultRows,
    updateAssessmentResponse,
  } from '$lib/features/assessments/model';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { renderAssessment } from '$lib/features/assessments/service';
  import type { AssessmentResult } from '$lib/core/domain/types';

  let page = $state(createAssessmentsPageState());
  let assessmentDefinition = $derived(renderAssessment(page.instrument));
  let latestResultRows = $derived(createAssessmentResultRows(page.latest));

  async function loadLatest() {
    page = await loadAssessmentsPage(page);
  }

  function setResponse(index: number, value: string) {
    page = {
      ...page,
      draftResponses: updateAssessmentResponse(page.draftResponses, index, value),
    };
  }

  async function saveProgress() {
    page = await saveAssessmentsProgressPage(page);
  }

  async function saveAssessment() {
    page = await submitAssessmentsPage(page);
  }

  onBrowserRouteMount(loadLatest);
</script>

<RoutePageHeader href="/assessments" />

{#if page.loading}
  <p class="status-copy">Loading assessment context…</p>
{:else}
  <div class="page-grid assessment-grid">
    <SectionCard title="Instrument">
      <Field label="Assessment">
        <select
          bind:value={page.instrument}
          aria-label="Assessment"
          onchange={(event) => {
            page = setAssessmentsInstrument(
              page,
              (event.currentTarget as HTMLSelectElement).value as AssessmentResult['instrument']
            );
            void loadLatest();
          }}
        >
          {#each assessmentInstrumentOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </Field>
      <p class="status-copy">{assessmentDefinition.recallWindow}</p>

      <div class="question-list">
        {#each assessmentDefinition.questions as question, index (question.id)}
          <Field className="question" label={question.prompt}>
            <select
              aria-label={`${page.instrument} question ${index + 1}`}
              value={page.draftResponses[index] >= 0 ? String(page.draftResponses[index]) : ''}
              onchange={(event) =>
                setResponse(index, (event.currentTarget as HTMLSelectElement).value)}
            >
              <option value="">Choose…</option>
              {#each assessmentDefinition.options as option (option.label)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </Field>
        {/each}
      </div>

      <div class="button-row">
        <Button variant="secondary" onclick={saveProgress}>Save progress</Button>
        <Button onclick={saveAssessment}>Save assessment</Button>
      </div>

      {#if page.saveNotice}
        <p class="status-copy">{page.saveNotice}</p>
      {/if}

      {#if page.validationError}
        <StatusBanner
          tone="warning"
          title="Complete the instrument"
          message={page.validationError}
        />
      {/if}

      {#if page.safetyMessage}
        <StatusBanner tone="risk" title="Urgent support guidance" message={page.safetyMessage} />
      {/if}
    </SectionCard>

    <SectionCard title="Latest result">
      {#if latestResultRows.length}
        <ul class="summary-list">
          {#each latestResultRows as row, index (row)}
            <li class:status-copy={index === latestResultRows.length - 1}>{row}</li>
          {/each}
        </ul>
      {:else if page.latest}
        <p class="status-copy">You have partial saved progress for today.</p>
      {:else}
        <p class="status-copy">No saved result for today yet.</p>
      {/if}
    </SectionCard>
  </div>
{/if}

<style>
  .question-list {
    display: grid;
    gap: 0.9rem;
    margin: 1rem 0;
  }

  @media (min-width: 960px) {
    .assessment-grid {
      grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr);
    }
  }
</style>
