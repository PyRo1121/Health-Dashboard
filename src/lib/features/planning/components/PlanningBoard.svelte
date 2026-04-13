<script lang="ts">
  import { Button, SectionCard } from '$lib/core/ui/primitives';
  import type {
    ExerciseCatalogItem,
    FoodCatalogItem,
    PlanSlot,
    RecipeCatalogItem,
    WorkoutTemplate,
  } from '$lib/core/domain/types';
  import { createSlotSummary, type PlanningBoardDay } from '$lib/features/planning/model';

  const SLOT_TYPE_LABELS = {
    meal: 'Meal',
    workout: 'Workout',
    note: 'Note',
  } as const;

  const STATUS_LABELS = {
    planned: 'Planned',
    done: 'Done',
    skipped: 'Skipped',
  } as const;

  let {
    boardDays,
    foodCatalogItems,
    recipeCatalogItems,
    workoutTemplates,
    exerciseCatalogItems,
    onMoveSlot,
    onMarkSlot,
    onRemoveSlot,
  }: {
    boardDays: PlanningBoardDay[];
    foodCatalogItems: FoodCatalogItem[];
    recipeCatalogItems: RecipeCatalogItem[];
    workoutTemplates: WorkoutTemplate[];
    exerciseCatalogItems: ExerciseCatalogItem[];
    onMoveSlot: (slotId: string, direction: 'up' | 'down') => void;
    onMarkSlot: (slotId: string, status: PlanSlot['status']) => void;
    onRemoveSlot: (slotId: string) => void;
  } = $props();
</script>

<SectionCard title="Week board">
  <div class="plan-board">
    {#each boardDays as day (day.localDay)}
      <article class="plan-day">
        <h3>{day.label}</h3>
        {#if day.slots.length}
          <ul class="slot-list">
            {#each day.slots as slot (slot.id)}
              <li class={`slot-card slot-card--${slot.slotType} slot-card--${slot.status}`}>
                <div class="slot-header">
                  <p class="slot-type">{SLOT_TYPE_LABELS[slot.slotType]}</p>
                  <span
                    class={`planning-status-chip status-chip planning-status-chip--${slot.status}`}
                  >
                    {STATUS_LABELS[slot.status]}
                  </span>
                </div>
                <div class="slot-copy">
                  <strong>{slot.title}</strong>
                  <p>
                    {createSlotSummary(
                      slot,
                      foodCatalogItems,
                      recipeCatalogItems,
                      workoutTemplates,
                      exerciseCatalogItems
                    )}
                  </p>
                </div>
                <div class="slot-actions">
                  <Button
                    variant="ghost"
                    onclick={() => onMoveSlot(slot.id, 'up')}
                    aria-label={`Move up ${slot.title}`}
                  >
                    Up
                  </Button>
                  <Button
                    variant="ghost"
                    onclick={() => onMoveSlot(slot.id, 'down')}
                    aria-label={`Move down ${slot.title}`}
                  >
                    Down
                  </Button>
                  <Button variant="ghost" onclick={() => onMarkSlot(slot.id, 'done')}>Done</Button>
                  <Button variant="ghost" onclick={() => onMarkSlot(slot.id, 'skipped')}
                    >Skip</Button
                  >
                  <Button variant="ghost" onclick={() => onMarkSlot(slot.id, 'planned')}
                    >Reset</Button
                  >
                  <Button variant="ghost" onclick={() => onRemoveSlot(slot.id)}>Remove</Button>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="status-copy">Nothing planned.</p>
        {/if}
      </article>
    {/each}
  </div>
</SectionCard>

<style>
  .plan-board {
    display: grid;
    gap: 0.85rem;
  }

  .plan-day {
    padding: 0.85rem;
    background: rgba(10, 60, 45, 0.18);
    border: 0.5px solid var(--phc-border-soft);
  }

  .plan-day h3 {
    margin: 0 0 0.75rem;
    font:
      700 0.95rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  .slot-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.7rem;
  }

  .slot-card {
    display: grid;
    gap: 0.8rem;
    padding: 0.9rem;
    background: rgba(0, 23, 15, 0.38);
    border: 0.5px solid var(--phc-border-soft);
  }

  .slot-card--meal {
    box-shadow: inset 0 0 0 1px rgba(166, 124, 46, 0.05);
  }

  .slot-card--workout {
    box-shadow: inset 0 0 0 1px rgba(31, 92, 74, 0.05);
  }

  .slot-card--note {
    background: rgba(10, 60, 45, 0.24);
  }

  .slot-card--done {
    border-color: rgba(31, 92, 74, 0.22);
  }

  .slot-card--skipped {
    border-color: rgba(181, 84, 60, 0.22);
  }

  .slot-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .slot-type {
    margin: 0;
    color: var(--phc-muted);
    font:
      700 0.72rem/1 Manrope,
      system-ui,
      sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .planning-status-chip {
    border-radius: 999px;
  }

  .slot-copy p {
    margin: 0.3rem 0 0;
    color: var(--phc-muted);
  }

  .slot-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  @media (min-width: 960px) {
    .plan-board {
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }
  }
</style>
