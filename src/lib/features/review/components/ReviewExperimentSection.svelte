<script lang="ts">
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';

  let {
    options,
    selectedExperiment,
    savedExperiment,
    saveNotice,
    onSelectExperiment,
    onSaveExperiment,
  }: {
    options: string[];
    selectedExperiment: string;
    savedExperiment?: string;
    saveNotice: string;
    onSelectExperiment: (value: string) => void;
    onSaveExperiment: () => void;
  } = $props();
</script>

<SectionCard title="Next-week experiment">
  <Field label="Next-week experiment">
    <select
      value={selectedExperiment}
      aria-label="Next-week experiment"
      onchange={(event) => onSelectExperiment((event.currentTarget as HTMLSelectElement).value)}
    >
      {#each options as option (option)}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </Field>
  <div class="button-row">
    <Button onclick={onSaveExperiment}>Save experiment</Button>
  </div>
  {#if savedExperiment}
    <p class="status-copy">Saved experiment: {savedExperiment}</p>
  {/if}
  {#if saveNotice}
    <p class="status-copy">{saveNotice}</p>
  {/if}
</SectionCard>
