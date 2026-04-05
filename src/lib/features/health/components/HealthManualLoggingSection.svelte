<script lang="ts">
  import { Button, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
  import type {
    AnxietyFormState,
    SleepNoteFormState,
    SymptomFormState,
  } from '$lib/features/health/model';

  let {
    symptomForm,
    anxietyForm,
    sleepNoteForm,
    onSymptomFieldChange,
    onAnxietyFieldChange,
    onSleepNoteFieldChange,
    onSaveSymptom,
    onSaveAnxiety,
    onSaveSleepNote,
  }: {
    symptomForm: SymptomFormState;
    anxietyForm: AnxietyFormState;
    sleepNoteForm: SleepNoteFormState;
    onSymptomFieldChange: (field: keyof SymptomFormState, value: string) => void;
    onAnxietyFieldChange: (field: keyof AnxietyFormState, value: string) => void;
    onSleepNoteFieldChange: (field: keyof SleepNoteFormState, value: string) => void;
    onSaveSymptom: () => void;
    onSaveAnxiety: () => void;
    onSaveSleepNote: () => void;
  } = $props();
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
  <Button onclick={onSaveSymptom}>Log symptom</Button>
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
  <Button onclick={onSaveAnxiety}>Log anxiety</Button>
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
  <Button onclick={onSaveSleepNote}>Log sleep note</Button>
</SectionCard>

<style>
  .spaced-field {
    margin-top: 0.9rem;
  }
</style>
