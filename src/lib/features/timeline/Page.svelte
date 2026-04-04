<script lang="ts">
	import { Card, EmptyState, Field } from '$lib/core/ui/primitives';
	import {
		createTimelinePageState,
		loadTimelinePage,
		setTimelineFilter
	} from '$lib/features/timeline/client';
	import {
		timelineEventStreamDescription,
		timelineFilterOptions
	} from '$lib/features/timeline/model';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
	import type { TimelineSourceFilter } from '$lib/features/timeline/service';

	let page = $state(createTimelinePageState());

	async function refreshTimeline() {
		page = await loadTimelinePage(page);
	}

	onBrowserRouteMount(refreshTimeline);
</script>

<RoutePageHeader href="/timeline" />

{#if page.loading}
	<p class="status-copy">Loading timeline…</p>
{:else}
	<div class="page-grid timeline-grid">
		<Card>
			<div class="toolbar">
				<div>
					<h2 class="card-title toolbar-title">Event stream</h2>
					<p class="status-copy">{timelineEventStreamDescription}</p>
				</div>

				<Field label="Timeline source filter">
					<select
						value={page.filter}
						aria-label="Timeline source filter"
						onchange={(event) => {
							page = setTimelineFilter(
								page,
								(event.currentTarget as HTMLSelectElement).value as TimelineSourceFilter
							);
							void refreshTimeline();
						}}
					>
						{#each timelineFilterOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</Field>
			</div>

			{#if page.items.length}
				<ul class="timeline-list">
					{#each page.items as item (item.event.id)}
						<li>
							<div class="event-header">
								<strong>{item.label}</strong>
								<span>{item.valueLabel}</span>
							</div>
							<p>{item.event.sourceApp}</p>
							<p>{item.sourceLabel} · {item.event.localDay}</p>
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					title="No timeline events yet."
					message="Save a check-in or import a companion bundle to populate the event stream."
				/>
			{/if}
		</Card>
	</div>
{/if}

<style>
	.toolbar {
		display: grid;
		gap: 1rem;
	}

	.timeline-list {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: grid;
		gap: 0.9rem;
	}

	.timeline-list li {
		padding-bottom: 0.9rem;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
	}

	.toolbar-title {
		margin-bottom: 0;
	}

	.event-header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.timeline-list p {
		margin: 0.3rem 0 0;
		color: #655e54;
	}

	@media (min-width: 960px) {
		.toolbar {
			grid-template-columns: minmax(0, 1fr) minmax(14rem, 18rem);
			align-items: end;
		}
	}
</style>
