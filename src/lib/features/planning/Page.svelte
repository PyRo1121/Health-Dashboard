<script lang="ts">
	import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
	import {
		addEmptyExerciseToWorkoutTemplate,
		addExerciseToWorkoutTemplate,
		createPlanningPageState,
		deletePlanningSlotPage,
		loadPlanningPage,
		markPlanningSlotStatusPage,
		movePlanningSlotPage,
		removeWorkoutTemplateExercise,
		savePlanningSlotPage,
		saveWorkoutTemplatePage,
		searchPlanningExercises,
		togglePlanningGroceryStatePage,
		updateWorkoutTemplateExerciseField,
	} from '$lib/features/planning/client';
	import {
		createExerciseSearchRows,
		createGrocerySummary,
		createGroceryGroups,
		createPlanningBoardDays,
		createRecipeSourceSummary,
		createWorkoutTemplateSummary,
		createSlotSummary
	} from '$lib/features/planning/model';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

	let page = $state(createPlanningPageState());
	let boardDays = $derived(createPlanningBoardDays(page.weekDays, page.slots));
	let exerciseSearchRows = $derived(createExerciseSearchRows(page.exerciseSearchResults));
	let groceryGroups = $derived(createGroceryGroups(page.groceryItems));

	async function refreshData() {
		page = await loadPlanningPage(undefined, page);
	}

	async function saveSlot() {
		page = await savePlanningSlotPage(page);
	}

	async function saveTemplate() {
		page = await saveWorkoutTemplatePage(page);
	}

	async function searchExercises() {
		page = await searchPlanningExercises(page);
	}

	async function markSlot(slotId: string, status: 'planned' | 'done' | 'skipped') {
		page = await markPlanningSlotStatusPage(page, slotId, status);
	}

	async function removeSlot(slotId: string) {
		page = await deletePlanningSlotPage(page, slotId);
	}

	async function moveSlot(slotId: string, direction: 'up' | 'down') {
		page = await movePlanningSlotPage(page, slotId, direction);
	}

	async function toggleGrocery(itemId: string, checked: boolean, excluded: boolean, onHand: boolean) {
		page = await togglePlanningGroceryStatePage(page, itemId, { checked, excluded, onHand });
	}

	function addExercise(title: string) {
		const exercise = page.exerciseSearchResults.find((item) => item.title === title);
		if (!exercise) return;
		page = addExerciseToWorkoutTemplate(page, exercise);
	}

	function addExerciseRow() {
		page = addEmptyExerciseToWorkoutTemplate(page);
	}

	function updateExerciseField(
		index: number,
		field: 'name' | 'sets' | 'reps' | 'restSeconds',
		value: string
	) {
		page = updateWorkoutTemplateExerciseField(page, index, field, value);
	}

	function removeExerciseRow(index: number) {
		page = removeWorkoutTemplateExercise(page, index);
	}

	onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/plan" />

{#if page.loading}
	<p class="status-copy">Loading weekly plan…</p>
{:else}
	<div class="page-grid plan-grid">
		<SectionCard title="Plan this week">
			<div class="field-grid">
				<Field label="Day">
					<select bind:value={page.slotForm.localDay} aria-label="Plan day">
						{#each page.weekDays as localDay (localDay)}
							<option value={localDay}>{localDay}</option>
						{/each}
					</select>
				</Field>
				<Field label="Slot type">
					<select
						value={page.slotForm.slotType}
						aria-label="Plan slot type"
						onchange={(event) => {
							const slotType = (event.currentTarget as HTMLSelectElement).value as
								| 'meal'
								| 'workout'
								| 'note';
							page = {
								...page,
								slotForm: {
									...page.slotForm,
									slotType
								}
							};
						}}
					>
						<option value="meal">Meal</option>
						<option value="workout">Workout</option>
						<option value="note">Note</option>
					</select>
				</Field>
			</div>

			{#if page.slotForm.slotType === 'meal'}
				<Field label="Meal source">
					<select
						value={page.slotForm.mealSource}
						aria-label="Meal source"
						onchange={(event) => {
							const mealSource = (event.currentTarget as HTMLSelectElement).value as
								| 'recipe'
								| 'food';
							page = {
								...page,
								slotForm: {
									...page.slotForm,
									mealSource,
									recipeId: '',
									foodCatalogItemId: ''
								}
							};
						}}
					>
						<option value="recipe">Recipe</option>
						<option value="food">Saved food</option>
					</select>
				</Field>
				{#if page.slotForm.mealSource === 'recipe'}
					<Field label="Recipe">
						<select bind:value={page.slotForm.recipeId} aria-label="Recipe">
							<option value="">Choose a saved recipe</option>
							{#each page.recipeCatalogItems as recipe (recipe.id)}
								<option value={recipe.id}>{recipe.title}</option>
							{/each}
						</select>
					</Field>
				{:else}
					<Field label="Saved food">
						<select bind:value={page.slotForm.foodCatalogItemId} aria-label="Saved food">
							<option value="">Choose a saved food</option>
							{#each page.foodCatalogItems as item (item.id)}
								<option value={item.id}>{item.name}</option>
							{/each}
						</select>
					</Field>
				{/if}
			{:else if page.slotForm.slotType === 'workout'}
				<Field label="Workout template">
					<select bind:value={page.slotForm.workoutTemplateId} aria-label="Workout template">
						<option value="">Choose a workout template</option>
						{#each page.workoutTemplates as template (template.id)}
							<option value={template.id}>{template.title}</option>
						{/each}
					</select>
				</Field>
			{:else}
				<Field label="Note title">
					<input bind:value={page.slotForm.title} aria-label="Note title" />
				</Field>
			{/if}

			<Field label="Notes">
				<textarea bind:value={page.slotForm.notes} aria-label="Plan notes" rows="3"></textarea>
			</Field>

			<div class="button-row">
				<Button onclick={saveSlot}>Add to week</Button>
			</div>
			{#if page.saveNotice}
				<p class="status-copy">{page.saveNotice}</p>
			{/if}
		</SectionCard>

		<SectionCard title="Workout templates">
			<Field label="Template name">
				<input bind:value={page.workoutTemplateForm.title} aria-label="Template name" />
			</Field>
			<Field label="Goal">
				<input bind:value={page.workoutTemplateForm.goal} aria-label="Template goal" />
			</Field>
			<div class="exercise-editor">
				<p class="exercise-editor__title">Exercises</p>
				{#each page.workoutTemplateForm.exercises as exercise, index (index)}
					<div class="exercise-row">
						<Field label={`Exercise ${index + 1}`}>
							<input
								value={exercise.name}
								aria-label={`Exercise ${index + 1}`}
								placeholder="Goblet squat"
								oninput={(event) =>
									updateExerciseField(index, 'name', (event.currentTarget as HTMLInputElement).value)}
							/>
						</Field>
						<Field label="Sets">
							<input
								value={exercise.sets?.toString() ?? ''}
								aria-label={`Sets ${index + 1}`}
								type="number"
								min="1"
								oninput={(event) =>
									updateExerciseField(index, 'sets', (event.currentTarget as HTMLInputElement).value)}
							/>
						</Field>
						<Field label="Reps">
							<input
								value={exercise.reps ?? ''}
								aria-label={`Reps ${index + 1}`}
								placeholder="8"
								oninput={(event) =>
									updateExerciseField(index, 'reps', (event.currentTarget as HTMLInputElement).value)}
							/>
						</Field>
						<Field label="Rest">
							<input
								value={exercise.restSeconds?.toString() ?? ''}
								aria-label={`Rest ${index + 1}`}
								type="number"
								min="0"
								placeholder="60"
								oninput={(event) =>
									updateExerciseField(index, 'restSeconds', (event.currentTarget as HTMLInputElement).value)}
							/>
						</Field>
						<div class="button-row compact-row-actions">
							<Button variant="ghost" onclick={() => removeExerciseRow(index)}>Remove exercise</Button>
						</div>
					</div>
				{/each}
				<div class="button-row">
					<Button variant="ghost" onclick={addExerciseRow}>Add exercise row</Button>
				</div>
			</div>
			<Field label="Search exercises">
				<input
					value={page.exerciseSearchQuery}
					aria-label="Search exercises"
					placeholder="Search wger exercises"
					oninput={(event) => {
						page = {
							...page,
							exerciseSearchQuery: (event.currentTarget as HTMLInputElement).value
						};
					}}
				/>
			</Field>
			<div class="button-row">
				<Button variant="secondary" onclick={searchExercises}>Search exercises</Button>
			</div>
			{#if exerciseSearchRows.length}
				<ul class="entry-list">
					{#each exerciseSearchRows as exercise (exercise.id)}
						<li>
							<div>
								<strong>{exercise.title}</strong>
								<p>{exercise.detail}</p>
							</div>
							<Button variant="ghost" onclick={() => addExercise(exercise.title)}>Add exercise</Button>
						</li>
					{/each}
				</ul>
			{/if}
			<div class="button-row">
				<Button variant="secondary" onclick={saveTemplate}>Save template</Button>
			</div>

			{#if page.workoutTemplates.length}
				<ul class="entry-list">
					{#each page.workoutTemplates as template (template.id)}
						<li>
							<div>
								<strong>{template.title}</strong>
								<p>{createWorkoutTemplateSummary(template)}</p>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="status-copy">No workout templates yet.</p>
			{/if}
		</SectionCard>

		<SectionCard title="Week board">
			<div class="plan-board">
				{#each boardDays as day (day.localDay)}
					<article class="plan-day">
						<h3>{day.label}</h3>
						{#if day.slots.length}
							<ul class="slot-list">
								{#each day.slots as slot (slot.id)}
									<li class={`slot-card slot-card--${slot.slotType} slot-card--${slot.status}`}>
										<div class="slot-copy">
											<strong>{slot.title}</strong>
											<p>{slot.slotType}</p>
											<p>{createSlotSummary(slot, page.foodCatalogItems, page.recipeCatalogItems, page.workoutTemplates, page.exerciseCatalogItems)}</p>
										</div>
										<div class="slot-actions">
											<Button
												variant="ghost"
												onclick={() => moveSlot(slot.id, 'up')}
												aria-label={`Move up ${slot.title}`}
											>
												Up
											</Button>
											<Button
												variant="ghost"
												onclick={() => moveSlot(slot.id, 'down')}
												aria-label={`Move down ${slot.title}`}
											>
												Down
											</Button>
											<Button variant="ghost" onclick={() => markSlot(slot.id, 'done')}>Done</Button>
											<Button variant="ghost" onclick={() => markSlot(slot.id, 'skipped')}>Skip</Button>
											<Button variant="ghost" onclick={() => markSlot(slot.id, 'planned')}>Reset</Button>
											<Button variant="ghost" onclick={() => removeSlot(slot.id)}>Remove</Button>
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

		<SectionCard title="Grocery draft">
			{#if groceryGroups.length}
				<div class="grocery-groups">
					{#each groceryGroups as group (group.aisle)}
						<section class="grocery-group">
							<h3>{group.aisle}</h3>
							<ul class="entry-list">
								{#each group.items as item (item.id)}
									<li class:item-muted={item.checked || item.excluded || item.onHand}>
										<div>
											<strong>{item.label}</strong>
											<p>{createGrocerySummary(item)}</p>
											{#if item.sourceRecipeIds.length}
												<p>{createRecipeSourceSummary(item, page.recipeCatalogItems)}</p>
											{/if}
										</div>
										<div class="slot-actions">
											<Button
												variant="ghost"
												onclick={() => toggleGrocery(item.id, !item.checked, item.excluded, item.onHand)}
											>
												{item.checked ? 'Uncheck' : 'Check'}
											</Button>
											<Button
												variant="ghost"
												onclick={() => toggleGrocery(item.id, item.checked, !item.excluded, item.onHand)}
											>
												{item.excluded ? 'Include' : 'Exclude'}
											</Button>
											<Button
												variant="ghost"
												onclick={() => toggleGrocery(item.id, item.checked, item.excluded, !item.onHand)}
											>
												{item.onHand ? 'Need it' : 'On hand'}
											</Button>
										</div>
									</li>
								{/each}
							</ul>
						</section>
					{/each}
				</div>
			{:else}
				<EmptyState
					title="No grocery items yet."
					message="Plan at least one recipe this week and the grocery draft will appear here."
				/>
			{/if}
		</SectionCard>
	</div>
{/if}

<style>
	.field-grid {
		margin: 0 0 1rem;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}

	.exercise-editor {
		display: grid;
		gap: 0.9rem;
		margin: 1rem 0;
	}

	.exercise-editor__title {
		margin: 0;
		font: 700 0.9rem/1.2 Manrope, system-ui, sans-serif;
		color: #3a352e;
	}

	.exercise-row {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
		border-radius: 0.85rem;
		border: 1px solid rgba(31, 29, 26, 0.08);
		background: rgba(241, 235, 226, 0.35);
	}

	.compact-row-actions {
		margin-top: 0;
	}

	.plan-board {
		display: grid;
		gap: 0.85rem;
	}

	.grocery-groups {
		display: grid;
		gap: 1rem;
	}

	.grocery-group h3 {
		margin: 0 0 0.75rem;
		font: 700 0.9rem/1.2 Manrope, system-ui, sans-serif;
		color: #655e54;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.plan-day {
		padding: 0.85rem;
		border-radius: 1rem;
		background: rgba(241, 235, 226, 0.45);
		border: 1px solid rgba(31, 29, 26, 0.06);
	}

	.plan-day h3 {
		margin: 0 0 0.75rem;
		font: 700 0.95rem/1.2 Manrope, system-ui, sans-serif;
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
		gap: 0.7rem;
		padding: 0.8rem;
		border-radius: 0.85rem;
		background: rgba(251, 248, 243, 0.92);
		border: 1px solid rgba(31, 29, 26, 0.08);
	}

	.slot-card--done {
		border-color: rgba(31, 92, 74, 0.18);
	}

	.slot-card--skipped {
		border-color: rgba(181, 84, 60, 0.18);
	}

	.slot-copy p {
		margin: 0.25rem 0 0;
		color: #655e54;
	}

	.slot-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.item-muted {
		opacity: 0.68;
	}

	@media (min-width: 960px) {
		.plan-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.plan-grid :global(section:nth-child(3)) {
			grid-column: 1 / -1;
		}

		.plan-board {
			grid-template-columns: repeat(7, minmax(0, 1fr));
		}
	}
</style>
