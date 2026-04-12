<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    applyTodayRecoveryActionPage,
    beginTodaySave,
    clearTodayPlannedMealPage,
    createTodayPageState,
    loadTodayPage,
    logTodayPlannedMealPage,
    markTodayPlanSlotStatusPage,
    saveTodayPage,
  } from '$lib/features/today/client';
  import {
    createTodayNutritionGuidance,
    createTodayNutritionPulseMetrics,
    createTodayNutritionRows,
    createTodayRecommendationSupportRows,
    createPlannedMealProjectionRows,
    createPlannedMealRows,
    createPlannedWorkoutRows,
    createTodayEventRows,
    createTodayPlanRows,
    createTodayRecordRows,
    type TodayFormState,
  } from '$lib/features/today/model';
  import type { TodayRecommendationAction } from '$lib/features/today/intelligence';
  import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
  import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
  import { buildStoredJournalIntentHref } from '$lib/features/journal/navigation';
  import {
    createTodayContextCaptureJournalIntent,
    createTodayRecoveryJournalIntent,
  } from '$lib/features/today/journal-intents';
  import TodayCheckInSection from '$lib/features/today/components/TodayCheckInSection.svelte';
  import TodayPlanSurface from '$lib/features/today/components/TodayPlanSurface.svelte';
  import TodaySignalsSection from '$lib/features/today/components/TodaySignalsSection.svelte';

  let page = $state(createTodayPageState());
  let dailyRecordRows = $derived(createTodayRecordRows(page.snapshot));
  let todayNutritionGuidance = $derived(createTodayNutritionGuidance(page.snapshot));
  let todayNutritionPulseMetrics = $derived(createTodayNutritionPulseMetrics(page.snapshot));
  let todayNutritionRows = $derived(createTodayNutritionRows(page.snapshot));
  let todayPlanRows = $derived(createTodayPlanRows(page.snapshot));
  let todayEventRows = $derived(createTodayEventRows(page.snapshot));
  let plannedMealRows = $derived(createPlannedMealRows(page.snapshot?.plannedMeal ?? null));
  let plannedWorkoutRows = $derived(
    createPlannedWorkoutRows(page.snapshot?.plannedWorkout ?? null)
  );
  let plannedMealProjectionRows = $derived(createPlannedMealProjectionRows(page.snapshot));
  let recommendationSupportRows = $derived(createTodayRecommendationSupportRows(page.snapshot));

  async function loadSnapshot() {
    page = await loadTodayPage();
  }

  async function handleSave() {
    if (!page.todayDate) return;
    page = beginTodaySave(page);
    page = await saveTodayPage(page);
  }

  async function handleLogPlannedMeal() {
    page = await logTodayPlannedMealPage(page);
  }

  async function handleClearPlannedMeal() {
    page = await clearTodayPlannedMealPage(page);
  }

  async function handlePlanStatus(slotId: string, status: 'planned' | 'done' | 'skipped') {
    page = await markTodayPlanSlotStatusPage(page, slotId, status);
  }

  async function handleRecoveryAction(
    actionId:
      | 'skip-workout'
      | 'clear-planned-meal'
      | 'apply-recovery-meal'
      | 'apply-recovery-workout'
  ) {
    if (actionId === 'skip-workout' && page.snapshot?.plannedWorkout) {
      page = await markTodayPlanSlotStatusPage(page, page.snapshot.plannedWorkout.id, 'skipped');
      return;
    }

    if (actionId === 'clear-planned-meal') {
      page = await clearTodayPlannedMealPage(page);
      return;
    }

    if (actionId === 'apply-recovery-meal' || actionId === 'apply-recovery-workout') {
      page = await applyTodayRecoveryActionPage(page, actionId);
    }
  }

  async function handleRecommendationAction(action: TodayRecommendationAction) {
    switch (action.kind) {
      case 'log-planned-meal':
        await handleLogPlannedMeal();
        return;
      case 'clear-planned-meal':
        await handleClearPlannedMeal();
        return;
      case 'plan-status':
        await handlePlanStatus(action.slotId, action.status);
        return;
      case 'recovery-action':
        await handleRecoveryAction(action.actionId);
        return;
      case 'open-journal-recovery-note':
        if (page.snapshot?.recoveryAdaptation) {
          await goto(
            resolve(
              buildStoredJournalIntentHref(
                createTodayRecoveryJournalIntent({
                  date: page.snapshot.date,
                  reasons: page.snapshot.recoveryAdaptation.reasons,
                  events: page.snapshot.events,
                })
              )
            )
          );
        }
        return;
      case 'open-journal-context-capture':
        if (page.snapshot) {
          await goto(
            resolve(
              buildStoredJournalIntentHref(
                createTodayContextCaptureJournalIntent({
                  date: page.snapshot.date,
                  events: page.snapshot.events,
                })
              )
            )
          );
        }
        return;
      default:
        return;
    }
  }

  function updateFormField(field: keyof TodayFormState, value: string) {
    page = {
      ...page,
      form: {
        ...page.form,
        [field]: value,
      },
    };
  }

  onBrowserRouteMount(loadSnapshot);
</script>

<RoutePageHeader href="/today" />

{#if page.loading}
  <p class="status-copy">Loading today…</p>
{:else}
  <div class="page-grid today-grid">
    <TodayCheckInSection
      form={page.form}
      saving={page.saving}
      saveNotice={page.saveNotice}
      onFormFieldChange={updateFormField}
      onSave={handleSave}
    />

    <TodayPlanSurface
      todayDate={page.todayDate}
      {dailyRecordRows}
      plannedMeal={page.snapshot?.plannedMeal ?? null}
      plannedMealIssue={page.snapshot?.plannedMealIssue ?? undefined}
      {plannedMealRows}
      plannedWorkout={page.snapshot?.plannedWorkout ?? null}
      plannedWorkoutIssue={page.snapshot?.plannedWorkoutIssue ?? undefined}
      {plannedWorkoutRows}
      {todayPlanRows}
      {todayEventRows}
      onLogPlannedMeal={handleLogPlannedMeal}
      onClearPlannedMeal={handleClearPlannedMeal}
      onPlanStatus={handlePlanStatus}
    />

    <TodaySignalsSection
      snapshot={page.snapshot}
      {todayNutritionPulseMetrics}
      {todayNutritionGuidance}
      {todayNutritionRows}
      {plannedMealProjectionRows}
      {recommendationSupportRows}
      onRecommendationAction={handleRecommendationAction}
    />
  </div>
{/if}

<style>
  @media (min-width: 960px) {
    .today-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .today-grid :global(section:first-child) {
      grid-column: 1 / -1;
    }
  }
</style>
