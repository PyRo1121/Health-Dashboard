<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, EmptyState, Field, SectionCard } from '$lib/core/ui/primitives';
	import {
		createReviewPageState,
		loadReviewPage,
		saveReviewExperimentPage,
		setReviewExperiment
	} from '$lib/features/review/client';
	import {
		createNutritionStrategyCards,
		createReviewSections,
		createReviewTrendRows
	} from '$lib/features/review/model';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';

	let page = $state(createReviewPageState());
	const trendRows = $derived(createReviewTrendRows(page.weekly));
	const reviewSections = $derived(createReviewSections(page.weekly));
	const nutritionStrategyCards = $derived(createNutritionStrategyCards(page.weekly));

	async function loadWeekly() {
		page = await loadReviewPage();
	}

	async function saveExperiment() {
		page = await saveReviewExperimentPage(page);
	}

	onBrowserRouteMount(loadWeekly);
</script>

<RoutePageHeader href="/review" />

{#if page.loading}
	<p class="status-copy">Building weekly briefing…</p>
{:else if page.weekly}
	<div class="page-grid review-grid">
		<SectionCard title="Weekly headline">
			<h3 class="card-headline">{page.weekly.snapshot.headline}</h3>
			<p class="status-copy">Tracked days: {page.weekly.snapshot.daysTracked}</p>
		</SectionCard>

		<SectionCard title="Trends">
			<ul class="summary-list">
				{#each trendRows as row (row)}
					<li>{row}</li>
				{/each}
			</ul>
		</SectionCard>

		<SectionCard title="Explainable correlations">
			{#if page.weekly.snapshot.correlations.length}
				<ul class="summary-list">
					{#each page.weekly.snapshot.correlations as correlation (correlation.label)}
						<li>
							<strong>{correlation.label}</strong>
							<p>{correlation.detail}</p>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					title="Need more tracked days."
					message="Log a fuller week before the app calls patterns with confidence."
				/>
			{/if}
		</SectionCard>

		{#each reviewSections as section (section.title)}
			<SectionCard title={section.title} titleClass={section.emphasis === 'strategy' ? 'card-title review-strategy-title' : 'card-title'}>
				{#if section.title === 'Repeat / rotate next week' && nutritionStrategyCards.length}
					<div class="review-strategy-cards">
						{#each nutritionStrategyCards as card (card.href)}
							<article class="review-strategy-card">
								<div class="review-strategy-copy">
									<span class="review-strategy-badge">{card.badge}</span>
									<strong>{card.title}</strong>
									<p>{card.detail}</p>
								</div>
								<a class="review-strategy-link" href={resolve(card.href)}>{card.actionLabel}</a>
							</article>
						{/each}
					</div>
				{:else if section.items.length}
					<ul class:review-strategy-list={section.emphasis === 'strategy'} class="summary-list">
						{#each section.items as line (line)}
							<li>{line}</li>
						{/each}
					</ul>
				{:else if section.emptyTitle}
					<EmptyState
						title={section.emptyTitle}
						message={section.emptyMessage ?? ''}
					/>
				{:else}
					<p class="status-copy">{section.emptyMessage}</p>
				{/if}
			</SectionCard>
		{/each}

		<SectionCard title="Next-week experiment">
			<Field label="Next-week experiment">
				<select
					value={page.selectedExperiment}
					aria-label="Next-week experiment"
					onchange={(event) => {
						page = setReviewExperiment(page, (event.currentTarget as HTMLSelectElement).value);
					}}
				>
					{#each page.weekly.experimentOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</Field>
			<div class="button-row">
				<Button onclick={saveExperiment}>Save experiment</Button>
			</div>
			{#if page.weekly.snapshot.experiment}
				<p class="status-copy">Saved experiment: {page.weekly.snapshot.experiment}</p>
			{/if}
			{#if page.saveNotice}
				<p class="status-copy">{page.saveNotice}</p>
			{/if}
		</SectionCard>
	</div>
{/if}

<style>
	.card-headline {
		margin: 0;
		font: 500 2rem/1.05 Newsreader, Georgia, serif;
	}

	.summary-list p {
		margin: 0.25rem 0 0;
		color: #3a352e;
	}

	:global(.review-strategy-title) {
		color: #1f5c4a;
	}

	.review-strategy-list {
		gap: 0.9rem;
	}

	.review-strategy-list li {
		padding: 0.85rem 0.95rem;
		border: 1px solid rgba(31, 92, 74, 0.12);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(31, 92, 74, 0.06) 0%, rgba(241, 235, 226, 0.6) 100%);
	}

	.review-strategy-cards {
		display: grid;
		gap: 0.9rem;
	}

	.review-strategy-card {
		display: grid;
		gap: 0.9rem;
		padding: 1rem;
		border: 1px solid rgba(31, 92, 74, 0.12);
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(31, 92, 74, 0.06) 0%, rgba(241, 235, 226, 0.72) 100%);
	}

	.review-strategy-copy {
		display: grid;
		gap: 0.4rem;
	}

	.review-strategy-copy p {
		margin: 0;
		color: #3a352e;
	}

	.review-strategy-badge {
		display: inline-flex;
		width: fit-content;
		padding: 0.28rem 0.6rem;
		border-radius: 999px;
		background: rgba(31, 92, 74, 0.12);
		color: #1f5c4a;
		font: 700 0.75rem/1 Manrope, system-ui, sans-serif;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.review-strategy-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: fit-content;
		min-height: 44px;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		background: #1f5c4a;
		color: #fbf8f3;
		font: 600 0.95rem/1 Manrope, system-ui, sans-serif;
		text-decoration: none;
	}

	.button-row {
		margin-top: 1rem;
	}

	@media (min-width: 960px) {
		.review-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.review-grid :global(section:first-child) {
			grid-column: 1 / -1;
		}
	}
</style>
