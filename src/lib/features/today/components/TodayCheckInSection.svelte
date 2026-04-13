<script lang="ts">
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import { todayMetricFields, type TodayFormState } from '$lib/features/today/model';

  let {
    form,
    saving,
    saveNotice,
    onFormFieldChange,
    onSave,
  }: {
    form: TodayFormState;
    saving: boolean;
    saveNotice: string;
    onFormFieldChange: (field: keyof TodayFormState, value: string) => void;
    onSave: () => void;
  } = $props();
</script>

<div id="today-check-in">
  <SectionCard title="Quick check-in">
    <div class="field-grid">
      {#each todayMetricFields as field (field.key)}
        <Field label={field.label}>
          <input
            value={form[field.key]}
            aria-label={field.label}
            type={field.type}
            min={field.min}
            max={field.max}
            step={field.step}
            oninput={(event) =>
              onFormFieldChange(field.key, (event.currentTarget as HTMLInputElement).value)}
          />
        </Field>
      {/each}
    </div>

    <Field className="note-field" label="Today note">
      <textarea
        value={form.freeformNote}
        aria-label="Today note"
        rows="4"
        oninput={(event) =>
          onFormFieldChange('freeformNote', (event.currentTarget as HTMLTextAreaElement).value)}
      ></textarea>
    </Field>

    <div class="button-row">
      <Button onclick={onSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save check-in'}
      </Button>
    </div>

    {#if saveNotice}
      <p class="status-copy">{saveNotice}</p>
    {/if}
  </SectionCard>
</div>

<style>
  .field-grid {
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  }

  @media (max-width: 639px) {
    .field-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7rem;
    }
  }
</style>
