<script lang="ts">
  import { Button, Field, SectionCard } from '$lib/core/ui/primitives';
  import type {
    ReviewExperimentCandidateView,
    ReviewSavedExperimentVerdictView,
  } from '$lib/features/review/model';

  let {
    candidates,
    selectedExperiment,
    savedExperiment,
    savedVerdict,
    saveNotice,
    onSelectExperiment,
    onSaveExperiment,
  }: {
    candidates: ReviewExperimentCandidateView[];
    selectedExperiment: string;
    savedExperiment?: string;
    savedVerdict: ReviewSavedExperimentVerdictView;
    saveNotice: string;
    onSelectExperiment: (value: string) => void;
    onSaveExperiment: () => void;
  } = $props();

  function optionRank(option: string): number {
    return candidates.findIndex((candidate) => candidate.id === option) + 1;
  }

  function optionMeta(option: string): ReviewExperimentCandidateView | undefined {
    return candidates.find((candidate) => candidate.id === option);
  }

  function isSaved(option: string): boolean {
    return optionMeta(option)?.label === savedExperiment;
  }

  function isSelected(option: string): boolean {
    return selectedExperiment === option;
  }

  function hasUnsavedSelection(): boolean {
    return Boolean(selectedExperiment) && optionMeta(selectedExperiment)?.label !== savedExperiment;
  }

  const experimentSelectId = 'review-experiment-select';
</script>

<SectionCard
  title="Next-week experiment"
  intro="Ranked upstream in deterministic order. Pick one experiment to run next week, then save it into the weekly review snapshot."
>
  {#if candidates.length === 0}
    <p class="status-copy">No experiment recommendations are ready yet.</p>
  {:else}
    <Field
      id={experimentSelectId}
      label="Next-week experiment"
      hint="The queue below mirrors this deterministic ranking with a more readable card view."
    >
      <select
        id={experimentSelectId}
        value={selectedExperiment}
        aria-label="Next-week experiment"
        onchange={(event) => onSelectExperiment((event.currentTarget as HTMLSelectElement).value)}
      >
        {#each candidates as candidate (candidate.label)}
          <option value={candidate.id}>{candidate.label}</option>
        {/each}
      </select>
    </Field>

    <fieldset class="review-experiment-list">
      <legend class="eyebrow-label review-experiment-list__legend">Recommendation queue</legend>
      {#each candidates as candidate, index (candidate.id)}
        <button
          type="button"
          class:selected={isSelected(candidate.id)}
          class:saved={isSaved(candidate.id)}
          class="review-experiment-option"
          aria-pressed={isSelected(candidate.id)}
          onclick={() => onSelectExperiment(candidate.id)}
        >
          <div class="review-experiment-option__body">
            <div class="review-experiment-option__meta">
              <span class="value-chip">Rank {index + 1}</span>
              <span
                class={`badge-chip badge-chip--${
                  candidate.confidenceLabel === 'High confidence'
                    ? 'adjust'
                    : candidate.confidenceLabel === 'Low confidence'
                      ? 'stop'
                      : 'muted'
                }`}
              >
                {candidate.confidenceLabel}
              </span>
              {#if isSelected(candidate.id)}
                <span class="badge-chip badge-chip--adjust">Selected</span>
              {/if}
              {#if isSaved(candidate.id)}
                <span class="badge-chip badge-chip--muted">Saved</span>
              {/if}
            </div>
            <p class="review-experiment-option__title">{candidate.label}</p>
            <p class="status-copy review-experiment-option__copy">{candidate.summary}</p>
            <p class="status-copy review-experiment-option__impact">{candidate.expectedImpact}</p>
            {#if candidate.provenance.length}
              <ul class="recommendation-list compact-list">
                {#each candidate.provenance as line (line)}
                  <li>{line}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </button>
      {/each}
    </fieldset>

    <div class="divider-block soft-panel surface-tone--accent review-experiment-summary">
      <p class="eyebrow-label">Selection preview</p>
      <p class="review-experiment-summary__title">
        {optionMeta(selectedExperiment)?.label ||
          'Select one recommendation to save for next week.'}
      </p>
      <p class="status-copy review-experiment-summary__copy">
        {#if !selectedExperiment}
          Pick one ranked recommendation to create a single clear experiment for next week.
        {:else if optionMeta(selectedExperiment)?.label === savedExperiment}
          This recommendation is already saved to the weekly snapshot.
        {:else if savedExperiment}
          Saving will replace the current saved experiment: {savedExperiment}
        {:else}
          Saving will store this recommendation in the weekly snapshot.
        {/if}
      </p>
      {#if selectedExperiment}
        <dl class="review-experiment-summary__facts">
          <div>
            <dt class="caps-label">Position</dt>
            <dd>Rank {optionRank(selectedExperiment)} of {candidates.length}</dd>
          </div>
          <div>
            <dt class="caps-label">Save state</dt>
            <dd>{hasUnsavedSelection() ? 'Needs save' : 'Already synced'}</dd>
          </div>
          {#if optionMeta(selectedExperiment)}
            <div>
              <dt class="caps-label">Expected impact</dt>
              <dd>{optionMeta(selectedExperiment)?.expectedImpact}</dd>
            </div>
          {/if}
        </dl>
      {/if}
    </div>

    {#if savedVerdict}
      <div class="divider-block soft-panel review-experiment-verdict">
        <div class="review-experiment-option__meta">
          <span
            class={`badge-chip badge-chip--${
              savedVerdict.badge === 'Continue'
                ? 'adjust'
                : savedVerdict.badge === 'Stop'
                  ? 'stop'
                  : 'muted'
            }`}
          >
            {savedVerdict.badge}
          </span>
          <span
            class={`badge-chip badge-chip--${
              savedVerdict.confidenceLabel === 'High confidence'
                ? 'adjust'
                : savedVerdict.confidenceLabel === 'Low confidence'
                  ? 'stop'
                  : 'muted'
            }`}
          >
            {savedVerdict.confidenceLabel}
          </span>
        </div>
        <p class="eyebrow-label">Current verdict on saved experiment</p>
        <p class="review-experiment-summary__title">{savedVerdict.label}</p>
        <p class="status-copy review-experiment-summary__copy">{savedVerdict.summary}</p>
        <p class="status-copy review-experiment-option__impact">{savedVerdict.expectedImpact}</p>
        {#if savedVerdict.provenance.length}
          <ul class="recommendation-list compact-list">
            {#each savedVerdict.provenance as line (line)}
              <li>{line}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}

    <div class="button-row review-experiment-actions">
      <Button onclick={onSaveExperiment} disabled={!selectedExperiment || !hasUnsavedSelection()}>
        {hasUnsavedSelection() ? 'Save experiment' : 'Experiment saved'}
      </Button>
    </div>
  {/if}

  {#if savedExperiment}
    <p class="status-copy review-experiment-saved divider-block">
      Saved experiment: {savedExperiment}
    </p>
  {/if}
  {#if saveNotice}
    <p class="status-copy review-experiment-notice divider-block">{saveNotice}</p>
  {/if}
</SectionCard>

<style>
  .review-experiment-list {
    display: grid;
    gap: 0.85rem;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .review-experiment-list__legend {
    margin-bottom: 0.1rem;
  }

  .review-experiment-option {
    display: grid;
    gap: 0.85rem;
    align-items: flex-start;
    padding: 0.95rem 1rem;
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(10, 60, 45, 0.16);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 180ms ease,
      background-color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  .review-experiment-option:hover {
    border-color: rgba(233, 195, 73, 0.22);
    background: rgba(10, 60, 45, 0.22);
  }

  .review-experiment-option.selected {
    border-color: rgba(233, 195, 73, 0.28);
    background: rgba(233, 195, 73, 0.08);
  }

  .review-experiment-option.saved {
    box-shadow: inset 0 0 0 1px rgba(138, 147, 141, 0.12);
  }

  .review-experiment-option__body {
    min-width: 0;
  }

  .review-experiment-option__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.6rem;
  }

  .review-experiment-option__title {
    margin: 0;
    color: var(--phc-text);
    font: 600 1rem/1.35 var(--phc-font-ui);
  }

  .review-experiment-option__copy {
    margin: 0.45rem 0 0;
  }

  .review-experiment-option__impact {
    margin: 0.3rem 0 0;
    color: var(--phc-label);
  }

  .review-experiment-summary__title {
    margin: 0.4rem 0 0;
    color: var(--phc-text);
    font: 600 1rem/1.35 var(--phc-font-ui);
  }

  .review-experiment-summary__copy {
    margin: 0.45rem 0 0;
  }

  .review-experiment-summary__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.85rem;
    margin: 0.9rem 0 0;
  }

  .review-experiment-summary__facts div {
    display: grid;
    gap: 0.3rem;
  }

  .review-experiment-summary__facts dt {
    color: var(--phc-muted);
  }

  .review-experiment-summary__facts dd {
    margin: 0;
    color: var(--phc-text);
    font: 600 0.95rem/1.4 var(--phc-font-ui);
  }

  .review-experiment-actions {
    margin-top: 0.95rem;
  }

  .review-experiment-option:focus-visible {
    outline: 2px solid var(--phc-focus);
    outline-offset: 2px;
  }

  @media (max-width: 639px) {
    .review-experiment-option {
      gap: 0.75rem;
      padding: 0.9rem;
    }

    .review-experiment-actions :global(.button) {
      width: 100%;
    }
  }
</style>
