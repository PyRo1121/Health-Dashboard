<script lang="ts">
  import type { ExternalSourceMetadata } from '$lib/core/domain/external-sources';
  import { toSafeExternalHref } from '$lib/core/shared/external-links';
  import type { HealthTemplate } from '$lib/core/domain/types';
  import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
  import {
    describeHealthTemplate,
    type HealthMedicationSuggestion,
    type TemplateFormState,
  } from '$lib/features/health/model';

  let {
    templateForm,
    templates,
    medicationSuggestions,
    medicationSuggestionNotice,
    medicationSuggestionMetadata,
    onTemplateFieldChange,
    onSaveTemplate,
    onQuickLogTemplate,
    onSearchMedicationSuggestions,
    onApplyMedicationSuggestion,
  }: {
    templateForm: TemplateFormState;
    templates: HealthTemplate[];
    medicationSuggestions: HealthMedicationSuggestion[];
    medicationSuggestionNotice: string;
    medicationSuggestionMetadata: ExternalSourceMetadata | null;
    onTemplateFieldChange: (field: keyof TemplateFormState, value: string) => void;
    onSaveTemplate: () => void;
    onQuickLogTemplate: (templateId: string) => void;
    onSearchMedicationSuggestions: () => void;
    onApplyMedicationSuggestion: (suggestion: HealthMedicationSuggestion) => void;
  } = $props();

  function createMetadataRows(metadata: ExternalSourceMetadata | null): string[] {
    if (!metadata) {
      return [];
    }

    const sourceNames = metadata.provenance.map((item) => item.sourceName).join(', ');

    return [
      sourceNames ? `Sources: ${sourceNames}` : '',
      `Cache: ${metadata.cacheStatus}`,
      `Status: ${metadata.degradationStatus}`,
    ].filter(Boolean);
  }
</script>

<SectionCard title="Medication and supplement templates">
  <Field label="Template name">
    <input
      value={templateForm.label}
      aria-label="Template name"
      placeholder="Magnesium glycinate"
      oninput={(event) =>
        onTemplateFieldChange('label', (event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <div class="spaced-field">
    <Field label="Template type">
      <select
        value={templateForm.templateType}
        aria-label="Template type"
        onchange={(event) =>
          onTemplateFieldChange('templateType', (event.currentTarget as HTMLSelectElement).value)}
      >
        <option value="supplement">Supplement</option>
        <option value="medication">Medication</option>
      </select>
    </Field>
  </div>
  <div class="field-grid spaced-field">
    <Field label="Default dose">
      <input
        value={templateForm.defaultDose}
        aria-label="Default dose"
        type="number"
        min="0"
        step="0.1"
        oninput={(event) =>
          onTemplateFieldChange('defaultDose', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
    <Field label="Default unit">
      <input
        value={templateForm.defaultUnit}
        aria-label="Default unit"
        placeholder="capsules"
        oninput={(event) =>
          onTemplateFieldChange('defaultUnit', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="spaced-field">
    <Field label="Template note">
      <textarea
        value={templateForm.note}
        aria-label="Template note"
        rows="3"
        placeholder="Taken with breakfast."
        oninput={(event) =>
          onTemplateFieldChange('note', (event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
    </Field>
  </div>
  <div class="button-row">
    <Button onclick={onSaveTemplate}>Save template</Button>
    {#if templateForm.templateType === 'medication'}
      <Button variant="ghost" onclick={onSearchMedicationSuggestions}>Suggest medications</Button>
    {/if}
  </div>
  {#if templateForm.templateType === 'medication' && medicationSuggestionNotice}
    <p class="status-copy">{medicationSuggestionNotice}</p>
  {/if}
  {#if templateForm.templateType === 'medication' && medicationSuggestionMetadata}
    <div class="metadata-block">
      {#each createMetadataRows(medicationSuggestionMetadata) as row (row)}
        <p class="status-copy">{row}</p>
      {/each}
    </div>
  {/if}
  {#if templateForm.templateType === 'medication' && medicationSuggestions.length}
    <ul class="template-list spaced-list">
      {#each medicationSuggestions as suggestion (suggestion.label)}
        <li>
          <div>
            <strong>{suggestion.label}</strong>
            {#if suggestion.code}
              <p>{suggestion.code}</p>
            {/if}
          </div>
          <div class="context-actions">
            <span class="status-copy">{suggestion.sourceName}</span>
            {#if toSafeExternalHref(suggestion.referenceUrl)}
              <a
                class="status-copy"
                href={toSafeExternalHref(suggestion.referenceUrl) ?? undefined}
                target="_blank"
                rel="external noreferrer"
                aria-label={`Learn more about ${suggestion.label}`}
              >
                Learn more
              </a>
            {/if}
            <Button
              variant="ghost"
              aria-label={`Use medication ${suggestion.label}`}
              onclick={() => onApplyMedicationSuggestion(suggestion)}
            >
              Use medication
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if templates.length}
    <ul class="template-list spaced-list">
      {#each templates as template (template.id)}
        <li>
          <div>
            <strong>{template.label}</strong>
            {#if toSafeExternalHref(template.referenceUrl)}
              <p>
                <a
                  class="status-copy"
                  href={toSafeExternalHref(template.referenceUrl) ?? undefined}
                  target="_blank"
                  rel="external noreferrer"
                  aria-label={`Learn more about saved ${
                    template.templateType === 'medication' ? 'medication' : 'supplement'
                  } ${template.label}`}
                >
                  Learn more
                </a>
              </p>
            {/if}
            {#each describeHealthTemplate(template) as line (line)}
              <p>{line}</p>
            {/each}
          </div>
          <Button variant="secondary" onclick={() => onQuickLogTemplate(template.id)}>
            Log now
          </Button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="spaced-list">
      <EmptyState
        title="No templates saved yet."
        message="Create a medication or supplement template once, then quick-log it in one tap."
      />
    </div>
  {/if}
</SectionCard>

<style>
  .field-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.85rem;
  }

  .spaced-field {
    margin-top: 0.9rem;
  }

  .spaced-list {
    margin-top: 1rem;
  }

  .metadata-block {
    margin-top: 0.35rem;
  }

  .template-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.85rem;
  }

  .template-list li {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }

  .template-list strong {
    color: var(--phc-text);
  }

  .template-list p {
    margin: 0.25rem 0 0;
    color: var(--phc-muted);
  }

  .context-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
