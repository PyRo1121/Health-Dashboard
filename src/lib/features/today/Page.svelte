<script lang="ts">
	import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
	import {
		beginTodaySave,
		clearTodayPlannedMealPage,
		createTodayPageState,
		loadTodayPage,
		logTodayPlannedMealPage,
		markTodayPlanSlotStatusPage,
		saveTodayPage
	} from '$lib/features/today/client';
	import {
		createTodayNutritionGuidance,
		createTodayNutritionPulseMetrics,
		createPlannedMealProjectionRows,
		createPlannedMealRows,
		createPlannedWorkoutRows,
		createTodayNutritionRows,
		createTodayEventRows,
		createTodayPlanRows,
		createTodayRecordRows,
		todayMetricFields
	} from '$lib/features/today/model';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

	let page = $state(createTodayPageState());
	let dailyRecordRows = $derived(createTodayRecordRows(page.snapshot));
	let todayNutritionGuidance = $derived(createTodayNutritionGuidance(page.snapshot));
	let todayNutritionPulseMetrics = $derived(createTodayNutritionPulseMetrics(page.snapshot));
	let todayNutritionRows = $derived(createTodayNutritionRows(page.snapshot));
	let todayPlanRows = $derived(createTodayPlanRows(page.snapshot));
	let todayEventRows = $derived(createTodayEventRows(page.snapshot));
	let plannedMealRows = $derived(createPlannedMealRows(page.snapshot?.plannedMeal ?? null));
	let plannedWorkoutRows = $derived(createPlannedWorkoutRows(page.snapshot?.plannedWorkout ?? null));
	let plannedMealProjectionRows = $derived(createPlannedMealProjectionRows(page.snapshot));

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

	onBrowserRouteMount(loadSnapshot);
</script>

<RoutePageHeader href="/today" />

{#if page.loading}
	<p class="status-copy">Loading today…</p>
{:else}
	<div class="page-grid today-grid">
		<SectionCard title="Quick check-in">
			<div class="field-grid">
				{#each todayMetricFields as field (field.key)}
					<Field label={field.label}>
						<input
							bind:value={page.form[field.key]}
							aria-label={field.label}
							type={field.type}
							min={field.min}
							max={field.max}
							step={field.step}
						/>
					</Field>
				{/each}
			</div>

			<Field className="note-field" label="Today note">
				<textarea bind:value={page.form.freeformNote} aria-label="Today note" rows="4"></textarea>
			</Field>

			<Button onclick={handleSave} disabled={page.saving}>
				{page.saving ? 'Saving…' : 'Save check-in'}
			</Button>

			{#if page.saveNotice}
				<p class="status-copy">{page.saveNotice}</p>
			{/if}
		</SectionCard>

		<SectionCard title="Daily briefing">
			<p class="status-copy">Date: {page.todayDate}</p>
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
			{#if page.snapshot?.plannedMeal}
				<strong>{page.snapshot.plannedMeal.name}</strong>
				<ul class="summary-list">
					{#each plannedMealRows as row (row)}
						<li>{row}</li>
					{/each}
				</ul>
				{#if page.snapshot.plannedMeal.sourceName}
					<p class="status-copy">Source: {page.snapshot.plannedMeal.sourceName}</p>
				{/if}
				{#if page.snapshot.plannedMeal.notes}
					<p class="status-copy">{page.snapshot.plannedMeal.notes}</p>
				{/if}
				<div class="button-row">
					<Button onclick={handleLogPlannedMeal}>Log planned meal</Button>
					<Button variant="ghost" onclick={handleClearPlannedMeal}>Clear plan</Button>
				</div>
			{:else if page.snapshot?.plannedMealIssue}
				<EmptyState
					title="Planned meal unavailable."
					message={page.snapshot.plannedMealIssue}
				/>
			{:else}
				<EmptyState
					title="No meal queued up."
					message="Plan something in Nutrition and it will appear here for one-tap logging."
				/>
			{/if}
		</SectionCard>

		<SectionCard title="Planned workout">
			{#if page.snapshot?.plannedWorkout}
				<strong>{page.snapshot.plannedWorkout.title}</strong>
				<ul class="summary-list">
					{#each plannedWorkoutRows as row (row)}
						<li>{row}</li>
					{/each}
				</ul>
				<div class="button-row">
					<Button onclick={() => handlePlanStatus(page.snapshot?.plannedWorkout?.id ?? '', 'done')}>
						Mark workout done
					</Button>
					<Button variant="ghost" onclick={() => handlePlanStatus(page.snapshot?.plannedWorkout?.id ?? '', 'skipped')}>
						Skip workout
					</Button>
				</div>
			{:else if page.snapshot?.plannedWorkoutIssue}
				<EmptyState
					title="Planned workout unavailable."
					message={page.snapshot.plannedWorkoutIssue}
				/>
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
								<Button variant="ghost" onclick={() => handlePlanStatus(item.id, 'done')}>
									Done
								</Button>
								<Button variant="ghost" onclick={() => handlePlanStatus(item.id, 'skipped')}>
									Skip
								</Button>
								{#if item.status !== 'planned'}
									<Button variant="ghost" onclick={() => handlePlanStatus(item.id, 'planned')}>
										Reset
									</Button>
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

		<SectionCard title="Nutrition pulse">
			{#if page.snapshot}
				<div class="nutrition-pulse-grid">
					{#each todayNutritionPulseMetrics as metric (metric.label)}
						<article class={`nutrition-pulse-card nutrition-pulse-card--${metric.tone}`}>
							<p class="nutrition-pulse-label">{metric.label}</p>
							<strong>{metric.current} / {metric.target}g</strong>
							{#if metric.projected !== null}
								<p class="status-copy">Planned next: {metric.projected} / {metric.target}g</p>
							{/if}
						</article>
					{/each}
				</div>

				<ul class="nutrition-guidance-list">
					{#each todayNutritionGuidance as line (line)}
						<li>{line}</li>
					{/each}
				</ul>

				<ul class="summary-list">
					{#each todayNutritionRows as row (row)}
						<li>{row}</li>
					{/each}
				</ul>
				{#if plannedMealProjectionRows.length}
					<p class="status-copy">If you log the planned meal next:</p>
					<ul class="summary-list">
						{#each plannedMealProjectionRows as row (row)}
							<li>{row}</li>
						{/each}
					</ul>
				{/if}
			{:else}
				<EmptyState
					title="No nutrition signal yet."
					message="Meals and plans will show their intake impact here."
				/>
			{/if}
		</SectionCard>

		<SectionCard title="Journal prompt">
			{#if page.snapshot?.latestJournalEntry}
				<h3 class="card-subtitle">{page.snapshot.latestJournalEntry.title ?? 'Latest reflection'}</h3>
				<p>{page.snapshot.latestJournalEntry.body}</p>
			{:else}
				<p class="status-copy">What grounded you today? Reflect on one moment of clarity.</p>
			{/if}
		</SectionCard>

		<SectionCard title="Same-day event stream">
			{#if todayEventRows.length}
				<ul class="event-list">
					{#each todayEventRows as event (event.id)}
						<li>
							<strong>{event.label}</strong>
							<span>{event.valueLabel}</span>
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
	</div>
{/if}

<style>
	.field-grid {
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
	}

	.event-list {
		padding: 0;
		margin: 0;
		list-style: none;
		display: grid;
		gap: 0.7rem;
	}

	.event-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.7rem;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
	}

	.nutrition-pulse-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
		margin-bottom: 0.9rem;
	}

	.nutrition-pulse-card {
		padding: 0.9rem;
		border-radius: 1rem;
		border: 1px solid rgba(31, 29, 26, 0.08);
		background: rgba(241, 235, 226, 0.5);
	}

	.nutrition-pulse-card--boost {
		border-color: rgba(184, 126, 42, 0.2);
		background: linear-gradient(180deg, rgba(184, 126, 42, 0.08), rgba(241, 235, 226, 0.6));
	}

	.nutrition-pulse-card--strong {
		border-color: rgba(31, 92, 74, 0.18);
		background: linear-gradient(180deg, rgba(31, 92, 74, 0.08), rgba(241, 235, 226, 0.6));
	}

	.nutrition-pulse-label {
		margin: 0 0 0.35rem;
		color: #6b6258;
		font: 700 0.78rem/1.2 Manrope, system-ui, sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.nutrition-guidance-list {
		margin: 0 0 0.9rem;
		padding-left: 1rem;
		display: grid;
		gap: 0.45rem;
		color: #3a352e;
	}

	.compact-actions {
		margin-top: 0;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	@media (min-width: 960px) {
		.today-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.today-grid :global(section:first-child) {
			grid-column: 1 / -1;
		}
	}
</style>
