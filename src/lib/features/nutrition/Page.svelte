<script lang="ts">
	import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
	import {
		clearNutritionPlannedMeal,
		createNutritionPageState,
		loadNutritionPage,
		lookupPackagedBarcode,
		planNutritionMeal,
		reuseNutritionMeal,
		searchNutritionFoods,
		searchNutritionRecipes,
		searchPackagedFoods,
		saveNutritionCatalogItem,
		saveNutritionMeal,
		saveNutritionRecurringMeal,
		useNutritionMatch,
		useNutritionRecipeIdea,
		updateNutritionBarcode,
		updateNutritionPackagedSearch,
		updateNutritionRecipeSearch,
		updateNutritionSearch
	} from '$lib/features/nutrition/client';
	import {
		clearNutritionIntentFromLocation,
		readNutritionIntentFromSearch
	} from '$lib/features/nutrition/navigation';
	import {
		createRecommendationContextRows,
		createRecommendationSummary,
		createNutritionDraftFromForm,
		createPlannedMealRows,
		createRecipeSummary,
		createNutritionSummaryRows,
		nutritionMealTypeOptions
	} from '$lib/features/nutrition/model';
	import { buildNutritionRecommendations } from '$lib/features/nutrition/recommend';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
	import { foodLookupResultFromCatalogItem, type FoodLookupResult } from '$lib/features/nutrition/service';
	import type { RecipeCatalogItem } from '$lib/core/domain/types';

	let page = $state(createNutritionPageState());
	let draftFromForm = $derived(createNutritionDraftFromForm(page.localDay, page.form, page.selectedMatch));
	let summaryRows = $derived(createNutritionSummaryRows(page.summary));
	let plannedMealRows = $derived(createPlannedMealRows(page.plannedMeal));
	let recommendationContextRows = $derived(
		createRecommendationContextRows({
			mealType: page.form.mealType,
			...page.recommendationContext
		})
	);
	let recommendations = $derived(
		buildNutritionRecommendations({
			context: {
				mealType: page.form.mealType,
				...page.recommendationContext
			},
			foods: page.catalogItems,
			recipes: page.recipeCatalogItems
		})
	);

	async function applyPendingIntent(nextPage: typeof page): Promise<typeof page> {
		const intent = readNutritionIntentFromSearch(window.location.search);
		if (!intent) {
			return nextPage;
		}

		clearNutritionIntentFromLocation(window.location, window.history);

		if (intent.kind === 'food') {
			const item = nextPage.catalogItems.find((candidate) => candidate.id === intent.id);
			if (!item) {
				return {
					...nextPage,
					searchNotice: 'That saved food is no longer available in your local catalog.'
				};
			}

			const hydrated = await useNutritionMatch(nextPage, foodLookupResultFromCatalogItem(item));
			return {
				...hydrated,
				searchNotice: 'Loaded from Review strategy.'
			};
		}

		const recipe = nextPage.recipeCatalogItems.find((candidate) => candidate.id === intent.id);
		if (!recipe) {
			return {
				...nextPage,
				recipeNotice: 'That saved recipe is no longer available in your local cache.'
			};
		}

		return {
			...useNutritionRecipeIdea(nextPage, recipe),
			recipeNotice: 'Loaded from Review strategy.'
		};
	}

	async function refreshData() {
		const loaded = await loadNutritionPage(page);
		page = await applyPendingIntent(loaded);
	}

	async function runSearch() {
		page = await searchNutritionFoods(page);
	}

	async function runPackagedSearch() {
		page = await searchPackagedFoods(page);
	}

	async function runBarcodeLookup() {
		page = await lookupPackagedBarcode(page);
	}

	async function runRecipeSearch() {
		page = await searchNutritionRecipes(page);
	}

	async function useMatch(match: FoodLookupResult) {
		page = await useNutritionMatch(page, match);
	}

	async function saveMeal() {
		page = await saveNutritionMeal(page, draftFromForm);
	}

	async function saveRecurringMeal() {
		page = await saveNutritionRecurringMeal(page, draftFromForm);
	}

	async function saveCustomFood() {
		page = await saveNutritionCatalogItem(page, {
			name: draftFromForm.name,
			calories: draftFromForm.calories,
			protein: draftFromForm.protein,
			fiber: draftFromForm.fiber,
			carbs: draftFromForm.carbs,
			fat: draftFromForm.fat
		});
	}

	async function savePlannedMeal() {
		page = await planNutritionMeal(page, draftFromForm);
	}

	async function clearPlannedMeal() {
		page = await clearNutritionPlannedMeal(page);
	}

	async function reuseMeal(id: string) {
		page = await reuseNutritionMeal(page, id);
	}

	function useRecipe(recipe: RecipeCatalogItem) {
		page = useNutritionRecipeIdea(page, recipe);
	}

	function loadPlannedMeal() {
		if (!page.plannedMeal) return;
		page = {
			...page,
			selectedMatch: null,
			saveNotice: 'Planned meal loaded into draft.',
			form: {
				...page.form,
				mealType: page.plannedMeal.mealType,
				name: page.plannedMeal.name,
				calories: String(page.plannedMeal.calories ?? 0),
				protein: String(page.plannedMeal.protein ?? 0),
				fiber: String(page.plannedMeal.fiber ?? 0),
				carbs: String(page.plannedMeal.carbs ?? 0),
				fat: String(page.plannedMeal.fat ?? 0),
				notes: page.plannedMeal.notes ?? ''
			}
		};
	}

	async function planRecommendation(recommendationId: string, kind: 'food' | 'recipe') {
		if (kind === 'food') {
			const item = page.catalogItems.find((candidate) => candidate.id === recommendationId);
			if (!item) return;
			page = await planNutritionMeal(page, {
				name: item.name,
				mealType: page.form.mealType,
				calories: item.calories ?? 0,
				protein: item.protein ?? 0,
				fiber: item.fiber ?? 0,
				carbs: item.carbs ?? 0,
				fat: item.fat ?? 0,
				notes: '',
				sourceName: item.sourceName
			});
			return;
		}

		const recipe = page.recipeCatalogItems.find((candidate) => candidate.id === recommendationId);
		if (!recipe) return;
		page = await planNutritionMeal(page, {
			name: recipe.title,
			mealType: recipe.mealType ?? page.form.mealType,
			calories: 0,
			protein: 0,
			fiber: 0,
			carbs: 0,
			fat: 0,
			notes: recipe.ingredients.slice(0, 4).join(', '),
			sourceName: recipe.sourceName
		});
	}

	async function useRecommendation(recommendationId: string, kind: 'food' | 'recipe') {
		if (kind === 'food') {
			const item = page.catalogItems.find((candidate) => candidate.id === recommendationId);
			if (!item) return;
			page = await useNutritionMatch(page, foodLookupResultFromCatalogItem(item));
			return;
		}

		const recipe = page.recipeCatalogItems.find((candidate) => candidate.id === recommendationId);
		if (!recipe) return;
		page = useNutritionRecipeIdea(page, recipe);
	}

	onBrowserRouteMount(refreshData);
</script>

<RoutePageHeader href="/nutrition" />

{#if page.loading}
	<p class="status-copy">Loading nutrition…</p>
{:else}
	<div class="page-grid nutrition-grid">
		<SectionCard title="Meal logging">
			<Field label="Food search">
				<input bind:value={page.searchQuery} aria-label="Food search" placeholder="Search USDA fallback foods" oninput={(event) => { page = updateNutritionSearch(page, (event.currentTarget as HTMLInputElement).value); }} />
			</Field>
			<div class="button-row">
				<Button variant="secondary" onclick={runSearch}>Search foods</Button>
			</div>

			{#if page.searchNotice}
				<p class="status-copy">{page.searchNotice}</p>
			{/if}

			{#if page.matches.length}
				<ul class="match-list">
					{#each page.matches as match (match.id)}
						<li>
							<div>
								<strong>{match.name}</strong>
								<p>{match.calories} kcal · {match.protein}g protein · {match.fiber}g fiber</p>
								<p>{match.carbs}g carbs · {match.fat}g fat</p>
							</div>
							<Button variant="ghost" onclick={() => useMatch(match)}>Use match</Button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="packaged-search">
				<Field label="Packaged product search">
					<input
						value={page.packagedQuery}
						aria-label="Packaged product search"
						placeholder="Search Open Food Facts packaged foods"
						oninput={(event) => {
							page = updateNutritionPackagedSearch(
								page,
								(event.currentTarget as HTMLInputElement).value
							);
						}}
					/>
				</Field>
				<div class="button-row">
					<Button variant="secondary" onclick={runPackagedSearch}>Search packaged foods</Button>
				</div>

				<Field label="Barcode lookup">
					<input
						value={page.barcodeQuery}
						aria-label="Barcode lookup"
						placeholder="Enter barcode"
						oninput={(event) => {
							page = updateNutritionBarcode(
								page,
								(event.currentTarget as HTMLInputElement).value
							);
						}}
					/>
				</Field>
				<div class="button-row">
					<Button variant="secondary" onclick={runBarcodeLookup}>Lookup barcode</Button>
				</div>

				{#if page.packagedNotice}
					<p class="status-copy">{page.packagedNotice}</p>
				{/if}

				{#if page.packagedMatches.length}
					<ul class="match-list">
						{#each page.packagedMatches as match (match.id)}
							<li>
								<div>
									<strong>{match.name}</strong>
									<p>{match.brandName ?? match.sourceName}</p>
									<p>{match.calories} kcal · {match.protein}g protein · {match.fiber}g fiber</p>
									<p>{match.carbs}g carbs · {match.fat}g fat</p>
								</div>
								<Button variant="ghost" onclick={() => useMatch(match)}>Use packaged</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="recipe-search">
				<Field label="Recipe search">
					<input
						value={page.recipeQuery}
						aria-label="Recipe search"
						placeholder="Search TheMealDB recipes"
						oninput={(event) => {
							page = updateNutritionRecipeSearch(
								page,
								(event.currentTarget as HTMLInputElement).value
							);
						}}
					/>
				</Field>
				<div class="button-row">
					<Button variant="secondary" onclick={runRecipeSearch}>Search recipes</Button>
				</div>

				{#if page.recipeNotice}
					<p class="status-copy">{page.recipeNotice}</p>
				{/if}

				{#if page.recipeMatches.length}
					<ul class="match-list">
						{#each page.recipeMatches as recipe (recipe.id)}
							<li>
								<div>
									<strong>{recipe.title}</strong>
									<p>{createRecipeSummary(recipe)}</p>
									<p>{recipe.ingredients.slice(0, 3).join(', ')}</p>
								</div>
								<Button variant="ghost" onclick={() => useRecipe(recipe)}>Use recipe</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="field-grid">
				<Field label="Meal type">
					<select bind:value={page.form.mealType} aria-label="Meal type">
						{#each nutritionMealTypeOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</Field>
				<Field label="Name">
					<input bind:value={page.form.name} aria-label="Meal name" />
				</Field>
				<Field label="Calories">
					<input bind:value={page.form.calories} aria-label="Calories" type="number" min="0" />
				</Field>
				<Field label="Protein">
					<input bind:value={page.form.protein} aria-label="Protein" type="number" min="0" />
				</Field>
				<Field label="Fiber">
					<input bind:value={page.form.fiber} aria-label="Fiber" type="number" min="0" />
				</Field>
				<Field label="Carbs">
					<input bind:value={page.form.carbs} aria-label="Carbs" type="number" min="0" />
				</Field>
				<Field label="Fat">
					<input bind:value={page.form.fat} aria-label="Fat" type="number" min="0" />
				</Field>
			</div>
			<div class="button-row">
				<Button onclick={saveMeal}>Save meal</Button>
				<Button variant="secondary" onclick={savePlannedMeal}>Plan next meal</Button>
				<Button variant="secondary" onclick={saveCustomFood}>Save as custom food</Button>
				<Button variant="secondary" onclick={saveRecurringMeal}>Save as recurring meal</Button>
			</div>

			{#if page.saveNotice}
				<p class="status-copy">{page.saveNotice}</p>
			{/if}
		</SectionCard>

		<SectionCard title="Planned next meal">
			{#if page.plannedMeal}
				<div class="planned-meal-copy">
					<strong>{page.plannedMeal.name}</strong>
					<ul class="summary-list">
						{#each plannedMealRows as row (row)}
							<li>{row}</li>
						{/each}
					</ul>
					{#if page.plannedMeal.sourceName}
						<p class="status-copy">Source: {page.plannedMeal.sourceName}</p>
					{/if}
					{#if page.plannedMeal.notes}
						<p class="status-copy">{page.plannedMeal.notes}</p>
					{/if}
				</div>
				<div class="button-row">
					<Button variant="secondary" onclick={loadPlannedMeal}>Load into draft</Button>
					<Button variant="ghost" onclick={clearPlannedMeal}>Clear plan</Button>
				</div>
			{:else}
				<EmptyState
					title="Nothing planned yet."
					message="Save a draft or recommendation here so Today can pick it up without re-searching."
				/>
			{/if}
		</SectionCard>

		<SectionCard title="Today summary">
			{#if page.summary.entries.length}
				<ul class="summary-list">
					{#each summaryRows as row (row)}
						<li>{row}</li>
					{/each}
				</ul>
				<ul class="entry-list">
					{#each page.summary.entries as entry (entry.id)}
						<li>{entry.name}</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					title="No meals logged for today."
					message="Log one simple meal first, then save it as recurring if it earns that spot."
				/>
			{/if}
		</SectionCard>

		<SectionCard title="Recurring meals">
			{#if page.favoriteMeals.length}
				<ul class="entry-list">
					{#each page.favoriteMeals as meal (meal.id)}
						<li>
							<div>
								<strong>{meal.name}</strong>
								<p>{meal.mealType}</p>
							</div>
							<Button variant="ghost" onclick={() => reuseMeal(meal.id)}>Reuse meal</Button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="status-copy">No recurring meals yet.</p>
			{/if}
		</SectionCard>

		<SectionCard title="Custom food catalog">
			{#if page.catalogItems.length}
				<ul class="entry-list">
					{#each page.catalogItems as item (item.id)}
						<li>
							<div>
								<strong>{item.name}</strong>
								<p>{item.calories ?? 0} kcal · {item.protein ?? 0}g protein · {item.fiber ?? 0}g fiber</p>
								<p>{item.carbs ?? 0}g carbs · {item.fat ?? 0}g fat</p>
							</div>
							<span class="status-copy">{item.sourceName}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="status-copy">No custom foods saved yet.</p>
			{/if}
		</SectionCard>

		<SectionCard title="Recipe cache">
			{#if page.recipeCatalogItems.length}
				<ul class="entry-list">
					{#each page.recipeCatalogItems as recipe (recipe.id)}
						<li>
							<div>
								<strong>{recipe.title}</strong>
								<p>{createRecipeSummary(recipe)}</p>
							</div>
							<Button variant="ghost" onclick={() => useRecipe(recipe)}>Use recipe</Button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="status-copy">No recipe ideas saved yet.</p>
			{/if}
		</SectionCard>

		<SectionCard title="Recommended next">
			<ul class="recommendation-context">
				{#each recommendationContextRows as row (row)}
					<li>{row}</li>
				{/each}
			</ul>

			{#if recommendations.length}
				<ul class="recommendation-list">
					{#each recommendations as recommendation (recommendation.id)}
						<li>
							<div>
								<strong>{recommendation.title}</strong>
								<p class="recommendation-meta">
									<span class="recommendation-score">{recommendation.score}</span>
									<span>{createRecommendationSummary(recommendation)}</span>
								</p>
								{#each recommendation.reasons as reason (reason)}
									<p>{reason}</p>
								{/each}
							</div>
							<div class="recommendation-actions">
								<Button
									variant="ghost"
									onclick={() => useRecommendation(recommendation.id, recommendation.kind)}
								>
									{recommendation.kind === 'food' ? 'Load food' : 'Load recipe'}
								</Button>
								<Button
									variant="secondary"
									onclick={() => planRecommendation(recommendation.id, recommendation.kind)}
								>
									Plan next
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="status-copy">Recommendations will appear once foods or recipes exist in your local catalog.</p>
			{/if}
		</SectionCard>
	</div>
{/if}

<style>
	.field-grid {
		margin: 1rem 0;
	}

	.match-list {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: grid;
		gap: 0.75rem;
	}

	.match-list li,
	.entry-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
	}

	.recommendation-context {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.5rem;
	}

	.recommendation-context li {
		padding: 0.6rem 0.75rem;
		border: 1px solid rgba(31, 29, 26, 0.08);
		border-radius: 0.85rem;
		background: rgba(241, 235, 226, 0.55);
		color: #3a352e;
		font: 500 0.88rem/1.35 var(--phc-font-ui);
	}

	.recommendation-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.9rem;
	}

	.recommendation-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 0 1rem;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
	}

	.recommendation-meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.recommendation-score {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		min-height: 2.25rem;
		padding: 0 0.5rem;
		border-radius: 999px;
		background: #1f5c4a;
		color: #fbf8f3;
		font: 700 0.9rem/1 var(--phc-font-ui);
	}

	.recommendation-actions {
		display: grid;
		gap: 0.6rem;
		justify-items: end;
	}

	@media (min-width: 960px) {
		.nutrition-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
