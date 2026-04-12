<script lang="ts">
  import SectionHeader from '$lib/core/ui/shell/SectionHeader.svelte';
  import { documentTitleFor } from '$lib/core/ui/shell/navigation';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import HealthEventStreamSection from '$lib/features/health/components/HealthEventStreamSection.svelte';
  import HealthManualLoggingSection from '$lib/features/health/components/HealthManualLoggingSection.svelte';
  import HealthOverviewSection from '$lib/features/health/components/HealthOverviewSection.svelte';
  import HealthTemplateSection from '$lib/features/health/components/HealthTemplateSection.svelte';
  import {
    createHealthPageState,
    loadHealthPage,
    quickLogTemplatePage,
    saveAnxietyPage,
    saveSleepNotePage,
    saveSymptomPage,
    saveTemplatePage,
  } from './client';
  import { createHealthEventRows, createSleepCardLines } from './model';

  let page = $state(createHealthPageState());
  let eventRows = $derived(createHealthEventRows(page.snapshot?.events ?? []));
  let sleepCardLines = $derived(createSleepCardLines(page.snapshot));

  async function loadSnapshot() {
    page = await loadHealthPage();
  }

  function mergeMutationResult(
    next: typeof page,
    preserve: Array<'symptomForm' | 'anxietyForm' | 'sleepNoteForm' | 'templateForm'>
  ) {
    const current = page;
    page = {
      ...next,
      symptomForm: preserve.includes('symptomForm') ? current.symptomForm : next.symptomForm,
      anxietyForm: preserve.includes('anxietyForm') ? current.anxietyForm : next.anxietyForm,
      sleepNoteForm: preserve.includes('sleepNoteForm')
        ? current.sleepNoteForm
        : next.sleepNoteForm,
      templateForm: preserve.includes('templateForm') ? current.templateForm : next.templateForm,
    };
  }

  async function saveSymptom() {
    mergeMutationResult(await saveSymptomPage(page), [
      'anxietyForm',
      'sleepNoteForm',
      'templateForm',
    ]);
  }

  async function saveAnxiety() {
    mergeMutationResult(await saveAnxietyPage(page), [
      'symptomForm',
      'sleepNoteForm',
      'templateForm',
    ]);
  }

  async function saveSleepNote() {
    mergeMutationResult(await saveSleepNotePage(page), [
      'symptomForm',
      'anxietyForm',
      'templateForm',
    ]);
  }

  async function saveTemplate() {
    mergeMutationResult(await saveTemplatePage(page), [
      'symptomForm',
      'anxietyForm',
      'sleepNoteForm',
    ]);
  }

  async function quickLogTemplate(templateId: string) {
    mergeMutationResult(await quickLogTemplatePage(page, templateId), [
      'symptomForm',
      'anxietyForm',
      'sleepNoteForm',
      'templateForm',
    ]);
  }

  function updateSymptomField(field: keyof typeof page.symptomForm, value: string) {
    page = {
      ...page,
      symptomForm: {
        ...page.symptomForm,
        [field]: value,
      },
    };
  }

  function updateAnxietyField(field: keyof typeof page.anxietyForm, value: string) {
    page = {
      ...page,
      anxietyForm: {
        ...page.anxietyForm,
        [field]: value,
      },
    };
  }

  function updateSleepNoteField(field: keyof typeof page.sleepNoteForm, value: string) {
    page = {
      ...page,
      sleepNoteForm: {
        ...page.sleepNoteForm,
        [field]: value,
      },
    };
  }

  function updateTemplateField(field: keyof typeof page.templateForm, value: string) {
    page = {
      ...page,
      templateForm: {
        ...page.templateForm,
        [field]: value,
      },
    };
  }

  onBrowserRouteMount(loadSnapshot);
</script>

<svelte:head>
  <title>{documentTitleFor('Health')}</title>
</svelte:head>

<SectionHeader
  eyebrow="Health Loop"
  title="Health"
  description="Capture sleep context, symptoms, anxiety episodes, and medication or supplement use in one calm local space."
/>

{#if page.loading}
  <p class="status-copy">Loading health context…</p>
{:else}
  <div class="page-grid health-grid">
    <HealthOverviewSection localDay={page.localDay} {sleepCardLines} saveNotice={page.saveNotice} />

    <HealthManualLoggingSection
      symptomForm={page.symptomForm}
      anxietyForm={page.anxietyForm}
      sleepNoteForm={page.sleepNoteForm}
      onSymptomFieldChange={updateSymptomField}
      onAnxietyFieldChange={updateAnxietyField}
      onSleepNoteFieldChange={updateSleepNoteField}
      onSaveSymptom={saveSymptom}
      onSaveAnxiety={saveAnxiety}
      onSaveSleepNote={saveSleepNote}
    />

    <HealthTemplateSection
      templateForm={page.templateForm}
      templates={page.snapshot?.templates ?? []}
      onTemplateFieldChange={updateTemplateField}
      onSaveTemplate={saveTemplate}
      onQuickLogTemplate={quickLogTemplate}
    />

    <HealthEventStreamSection {eventRows} />
  </div>
{/if}

<style>
  @media (min-width: 960px) {
    .health-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .health-grid :global(section:first-child) {
      grid-column: 1 / -1;
    }
  }
</style>
