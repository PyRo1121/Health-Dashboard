<script lang="ts">
  import type { PlannedMeal } from '$lib/core/domain/types';
  import { Button, EmptyState, SectionCard } from '$lib/core/ui/primitives';

  let {
    plannedMeal,
    plannedMealIssue,
    plannedMealRows,
    onLoadPlannedMeal,
    onClearPlannedMeal,
  }: {
    plannedMeal: PlannedMeal | null;
    plannedMealIssue?: string;
    plannedMealRows: string[];
    onLoadPlannedMeal: () => void;
    onClearPlannedMeal: () => void;
  } = $props();
</script>

<SectionCard title="Planned next meal">
  {#if plannedMeal}
    <div class="planned-meal-copy">
      <strong>{plannedMeal.name}</strong>
      <ul class="summary-list">
        {#each plannedMealRows as row (row)}
          <li>{row}</li>
        {/each}
      </ul>
      {#if plannedMeal.sourceName}
        <p class="status-copy">Source: {plannedMeal.sourceName}</p>
      {/if}
      {#if plannedMeal.notes}
        <p class="status-copy">{plannedMeal.notes}</p>
      {/if}
    </div>
    <div class="button-row">
      <Button variant="secondary" onclick={onLoadPlannedMeal}>Load into draft</Button>
      <Button variant="ghost" onclick={onClearPlannedMeal}>Clear plan</Button>
    </div>
  {:else if plannedMealIssue}
    <EmptyState title="Planned meal unavailable." message={plannedMealIssue} />
  {:else}
    <EmptyState
      title="Nothing planned yet."
      message="Save a draft or recommendation here so Today can pick it up without re-searching."
    />
  {/if}
</SectionCard>
