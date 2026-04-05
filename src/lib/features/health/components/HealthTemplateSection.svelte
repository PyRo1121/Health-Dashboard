<script lang="ts">
  import type { HealthTemplate } from '$lib/core/domain/types';
  import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
  import { describeHealthTemplate, type TemplateFormState } from '$lib/features/health/model';

  let {
    templateForm,
    templates,
    onTemplateFieldChange,
    onSaveTemplate,
    onQuickLogTemplate,
  }: {
    templateForm: TemplateFormState;
    templates: HealthTemplate[];
    onTemplateFieldChange: (field: keyof TemplateFormState, value: string) => void;
    onSaveTemplate: () => void;
    onQuickLogTemplate: (templateId: string) => void;
  } = $props();
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
  <Button onclick={onSaveTemplate}>Save template</Button>

  {#if templates.length}
    <ul class="template-list spaced-list">
      {#each templates as template (template.id)}
        <li>
          <div>
            <strong>{template.label}</strong>
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
    gap: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid rgba(31, 29, 26, 0.08);
  }

  .template-list p {
    margin: 0.25rem 0 0;
    color: #3a352e;
  }
</style>
