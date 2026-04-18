<script lang="ts">
  import { toSafeExternalHref } from '$lib/core/shared/external-links';
  import type { PlannedMeal } from '$lib/core/domain/types';
  import { Button, EmptyState, SectionCard } from '$lib/core/ui/primitives';
  import type { TodayEventRow, TodayPlanRow } from '$lib/features/today/model';
  import type { TodayPlannedWorkout } from '$lib/features/today/snapshot';

  let {
    todayDate,
    dailyRecordRows,
    plannedMeal,
    plannedMealIssue,
    plannedMealRows,
    plannedWorkout,
    plannedWorkoutIssue,
    plannedWorkoutRows,
    todayPlanRows,
    todayEventRows,
    onLogPlannedMeal,
    onClearPlannedMeal,
    onPlanStatus,
  }: {
    todayDate: string;
    dailyRecordRows: string[];
    plannedMeal: PlannedMeal | null;
    plannedMealIssue?: string;
    plannedMealRows: string[];
    plannedWorkout: TodayPlannedWorkout | null;
    plannedWorkoutIssue?: string;
    plannedWorkoutRows: string[];
    todayPlanRows: TodayPlanRow[];
    todayEventRows: TodayEventRow[];
    onLogPlannedMeal: () => void;
    onClearPlannedMeal: () => void;
    onPlanStatus: (slotId: string, status: 'planned' | 'done' | 'skipped') => void;
  } = $props();
</script>

<SectionCard title="Daily briefing">
  <p class="status-copy">Date: {todayDate}</p>
  {#if dailyRecordRows.length}
    <ul class="summary-list">
      {#each dailyRecordRows as row (row)}
        <li>{row}</li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="Nothing logged yet today."
      message="Start with how you feel, then add anything that mattered."
    />
  {/if}
</SectionCard>

<SectionCard title="Planned next meal">
  {#if plannedMeal}
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
    <div class="button-row">
      <Button onclick={onLogPlannedMeal}>Log planned meal</Button>
      <Button variant="ghost" onclick={onClearPlannedMeal}>Clear plan</Button>
    </div>
  {:else if plannedMealIssue}
    <EmptyState title="Planned meal unavailable." message={plannedMealIssue} />
  {:else}
    <EmptyState
      title="No meal queued up."
      message="Plan something in Nutrition and it will appear here for one-tap logging."
    />
  {/if}
</SectionCard>

<SectionCard title="Planned workout">
  {#if plannedWorkout}
    <strong>{plannedWorkout.title}</strong>
    <ul class="summary-list">
      {#each plannedWorkoutRows as row (row)}
        <li>{row}</li>
      {/each}
    </ul>
    <div class="button-row">
      <Button onclick={() => onPlanStatus(plannedWorkout.id, 'done')}>Mark workout done</Button>
      <Button variant="ghost" onclick={() => onPlanStatus(plannedWorkout.id, 'skipped')}>
        Skip workout
      </Button>
    </div>
  {:else if plannedWorkoutIssue}
    <EmptyState title="Planned workout unavailable." message={plannedWorkoutIssue} />
  {:else}
    <EmptyState
      title="No workout lined up."
      message="Use Plan to queue a workout and Today will surface it here."
    />
  {/if}
</SectionCard>

<SectionCard title="Today's plan">
  {#if todayPlanRows.length}
    <ul class="event-list">
      {#each todayPlanRows as item (item.id)}
        <li>
          <div>
            <strong>{item.title}</strong>
            <p>{item.subtitle}</p>
          </div>
          <div class="button-row compact-actions">
            <Button variant="ghost" onclick={() => onPlanStatus(item.id, 'done')}>Done</Button>
            <Button variant="ghost" onclick={() => onPlanStatus(item.id, 'skipped')}>Skip</Button>
            {#if item.status !== 'planned'}
              <Button variant="ghost" onclick={() => onPlanStatus(item.id, 'planned')}>Reset</Button
              >
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No planned items for today."
      message="Use Plan to shape the day before it starts."
    />
  {/if}
</SectionCard>

<SectionCard title="Same-day event stream">
  {#if todayEventRows.length}
    <ul class="event-list">
      {#each todayEventRows as event (event.id)}
        <li>
          <strong>{event.label}</strong>
          <span>{event.valueLabel}</span>
          {#if toSafeExternalHref(event.referenceUrl)}
            <a
              class="event-reference-link"
              href={toSafeExternalHref(event.referenceUrl) ?? undefined}
              target="_blank"
              rel="external noreferrer"
              aria-label={`Learn more about same-day event ${event.label}`}
            >
              Learn more
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState
      title="No same-day events yet."
      message="Once you save today’s check-in, the event stream will appear here."
    />
  {/if}
</SectionCard>

<style>
  .event-list {
    gap: 0.7rem;
  }

  .event-reference-link {
    margin-left: 0.75rem;
    color: var(--phc-label);
  }

  .compact-actions {
    margin-top: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>
