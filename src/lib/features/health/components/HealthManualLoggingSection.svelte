<script lang="ts">
  import type { ExternalSourceMetadata } from '$lib/core/domain/external-sources';
  import { toSafeExternalHref } from '$lib/core/shared/external-links';
  import { Button, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
  import type {
    AnxietyFormState,
    HealthSymptomSuggestion,
    SleepNoteFormState,
    SymptomFormState,
  } from '$lib/features/health/model';

  let {
    symptomForm,
    symptomSuggestions,
    symptomSuggestionNotice,
    symptomSuggestionMetadata,
    anxietyForm,
    sleepNoteForm,
    onSymptomFieldChange,
    onAnxietyFieldChange,
    onSleepNoteFieldChange,
    onSaveSymptom,
    onSaveAnxiety,
    onSaveSleepNote,
    onSearchSymptomSuggestions,
    onApplySymptomSuggestion,
  }: {
    symptomForm: SymptomFormState;
    symptomSuggestions: HealthSymptomSuggestion[];
    symptomSuggestionNotice: string;
    symptomSuggestionMetadata: ExternalSourceMetadata | null;
    anxietyForm: AnxietyFormState;
    sleepNoteForm: SleepNoteFormState;
    onSymptomFieldChange: (field: keyof SymptomFormState, value: string) => void;
    onAnxietyFieldChange: (field: keyof AnxietyFormState, value: string) => void;
    onSleepNoteFieldChange: (field: keyof SleepNoteFormState, value: string) => void;
    onSaveSymptom: () => void;
    onSaveAnxiety: () => void;
    onSaveSleepNote: () => void;
    onSearchSymptomSuggestions: () => void;
    onApplySymptomSuggestion: (suggestion: HealthSymptomSuggestion) => void;
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

<SectionCard title="Log symptom">
  <Field label="Symptom">
    <input
      value={symptomForm.symptom}
      aria-label="Symptom"
      placeholder="Headache"
      oninput={(event) =>
        onSymptomFieldChange('symptom', (event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <div class="spaced-field">
    <Field label="Severity (1-5)">
      <input
        value={symptomForm.severity}
        aria-label="Symptom severity"
        type="number"
        min="1"
        max="5"
        oninput={(event) =>
          onSymptomFieldChange('severity', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="spaced-field">
    <Field label="Symptom note">
      <textarea
        value={symptomForm.note}
        aria-label="Symptom note"
        rows="4"
        placeholder="Keep it specific and brief."
        oninput={(event) =>
          onSymptomFieldChange('note', (event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
    </Field>
  </div>
  <div class="button-row">
    <Button onclick={onSaveSymptom}>Log symptom</Button>
    <Button variant="ghost" onclick={onSearchSymptomSuggestions}>Suggest symptoms</Button>
  </div>
  {#if symptomSuggestionNotice}
    <p class="status-copy">{symptomSuggestionNotice}</p>
  {/if}
  {#if symptomSuggestionMetadata}
    <div class="metadata-block">
      {#each createMetadataRows(symptomSuggestionMetadata) as row (row)}
        <p class="status-copy">{row}</p>
      {/each}
    </div>
  {/if}
  {#if symptomSuggestions.length}
    <ul class="entry-list linked-context-list">
      {#each symptomSuggestions as suggestion (suggestion.label)}
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
                rel="noreferrer"
                aria-label={`Learn more about ${suggestion.label}`}
              >
                Learn more
              </a>
            {/if}
            <Button
              variant="ghost"
              aria-label={`Use symptom ${suggestion.label}`}
              onclick={() => onApplySymptomSuggestion(suggestion)}
            >
              Use symptom
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</SectionCard>

<SectionCard title="Log anxiety episode">
  <Field label="Intensity (1-5)">
    <input
      value={anxietyForm.intensity}
      aria-label="Anxiety intensity"
      type="number"
      min="1"
      max="5"
      oninput={(event) =>
        onAnxietyFieldChange('intensity', (event.currentTarget as HTMLInputElement).value)}
    />
  </Field>
  <div class="spaced-field">
    <Field label="Trigger">
      <input
        value={anxietyForm.trigger}
        aria-label="Anxiety trigger"
        placeholder="Crowded store"
        oninput={(event) =>
          onAnxietyFieldChange('trigger', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="spaced-field">
    <Field label="Duration in minutes">
      <input
        value={anxietyForm.durationMinutes}
        aria-label="Anxiety duration in minutes"
        type="number"
        min="0"
        oninput={(event) =>
          onAnxietyFieldChange('durationMinutes', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="spaced-field">
    <Field label="Anxiety note">
      <textarea
        value={anxietyForm.note}
        aria-label="Anxiety note"
        rows="4"
        placeholder="What helped, if anything?"
        oninput={(event) =>
          onAnxietyFieldChange('note', (event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
    </Field>
  </div>
  <div class="button-row">
    <Button onclick={onSaveAnxiety}>Log anxiety</Button>
  </div>
</SectionCard>

<SectionCard title="Log sleep context">
  <StatusBanner
    tone="neutral"
    title="Sleep quality is more than a number."
    message="Use this to capture how sleep felt, what disrupted it, or what helped."
  />
  <div class="spaced-field">
    <Field label="Sleep note">
      <textarea
        value={sleepNoteForm.note}
        aria-label="Sleep note"
        rows="4"
        placeholder="Woke up twice but fell back asleep quickly."
        oninput={(event) =>
          onSleepNoteFieldChange('note', (event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
    </Field>
  </div>
  <div class="spaced-field">
    <Field label="Restfulness (optional, 1-5)">
      <input
        value={sleepNoteForm.restfulness}
        aria-label="Sleep restfulness"
        type="number"
        min="1"
        max="5"
        oninput={(event) =>
          onSleepNoteFieldChange('restfulness', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="spaced-field">
    <Field label="Context (optional)">
      <input
        value={sleepNoteForm.context}
        aria-label="Sleep context"
        placeholder="Late caffeine"
        oninput={(event) =>
          onSleepNoteFieldChange('context', (event.currentTarget as HTMLInputElement).value)}
      />
    </Field>
  </div>
  <div class="button-row">
    <Button onclick={onSaveSleepNote}>Log sleep note</Button>
  </div>
</SectionCard>

<style>
  .spaced-field {
    margin-top: 0.9rem;
  }

  .metadata-block {
    margin-top: 0.35rem;
  }
</style>
