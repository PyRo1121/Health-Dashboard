<script lang="ts">
	import { Button, EmptyState, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
	import SectionHeader from '$lib/core/ui/shell/SectionHeader.svelte';
	import { documentTitleFor } from '$lib/core/ui/shell/navigation';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import {
		createHealthPageState,
		loadHealthPage,
		quickLogTemplatePage,
		saveAnxietyPage,
		saveSleepNotePage,
		saveSymptomPage,
		saveTemplatePage
	} from './client';
	import {
		createHealthEventRows,
		createSleepCardLines,
		describeHealthTemplate
	} from './model';

	let page = $state(createHealthPageState());
	let eventRows = $derived(createHealthEventRows(page.snapshot?.events ?? []));
	let sleepCardLines = $derived(createSleepCardLines(page.snapshot));

	async function loadSnapshot() {
		page = await loadHealthPage();
	}

	async function saveSymptom() {
		page = await saveSymptomPage(page);
	}

	async function saveAnxiety() {
		page = await saveAnxietyPage(page);
	}

	async function saveSleepNote() {
		page = await saveSleepNotePage(page);
	}

	async function saveTemplate() {
		page = await saveTemplatePage(page);
	}

	async function quickLogTemplate(templateId: string) {
		page = await quickLogTemplatePage(page, templateId);
	}

	onBrowserRouteMount(loadSnapshot);
</script>

<svelte:head>
	<title>{documentTitleFor('Health')}</title>
</svelte:head>

<SectionHeader
	eyebrow="Health Loop"
	title="Health"
	description="Capture sleep context, symptoms, anxiety episodes, and medication or supplement use in one calm local space."
/>

{#if page.loading}
	<p class="status-copy">Loading health context…</p>
{:else}
	<div class="page-grid health-grid">
		<SectionCard title="Today at a glance">
			<p class="status-copy">Date: {page.localDay}</p>
			{#if sleepCardLines.length}
				<ul class="summary-list">
					{#each sleepCardLines as line (line)}
						<li>{line}</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					title="No imported sleep yet."
					message="When sleep-duration data lands, it will show up here beside your manual health logging."
				/>
			{/if}

			{#if page.saveNotice}
				<p class="status-copy">{page.saveNotice}</p>
			{/if}
		</SectionCard>

		<SectionCard title="Log symptom">
			<Field label="Symptom">
				<input bind:value={page.symptomForm.symptom} aria-label="Symptom" placeholder="Headache" />
			</Field>
			<Field className="spaced-field" label="Severity (1-5)">
				<input bind:value={page.symptomForm.severity} aria-label="Symptom severity" type="number" min="1" max="5" />
			</Field>
			<Field className="spaced-field" label="Symptom note">
				<textarea
					bind:value={page.symptomForm.note}
					aria-label="Symptom note"
					rows="4"
					placeholder="Keep it specific and brief."
				></textarea>
			</Field>
			<Button onclick={saveSymptom}>Log symptom</Button>
		</SectionCard>

		<SectionCard title="Log anxiety episode">
			<Field label="Intensity (1-5)">
				<input bind:value={page.anxietyForm.intensity} aria-label="Anxiety intensity" type="number" min="1" max="5" />
			</Field>
			<Field className="spaced-field" label="Trigger">
				<input bind:value={page.anxietyForm.trigger} aria-label="Anxiety trigger" placeholder="Crowded store" />
			</Field>
			<Field className="spaced-field" label="Duration in minutes">
				<input bind:value={page.anxietyForm.durationMinutes} aria-label="Anxiety duration in minutes" type="number" min="0" />
			</Field>
			<Field className="spaced-field" label="Anxiety note">
				<textarea
					bind:value={page.anxietyForm.note}
					aria-label="Anxiety note"
					rows="4"
					placeholder="What helped, if anything?"
				></textarea>
			</Field>
			<Button onclick={saveAnxiety}>Log anxiety</Button>
		</SectionCard>

		<SectionCard title="Log sleep context">
			<StatusBanner
				tone="neutral"
				title="Sleep quality is more than a number."
				message="Use this to capture how sleep felt, what disrupted it, or what helped."
			/>
			<Field className="spaced-field" label="Sleep note">
				<textarea
					bind:value={page.sleepNoteForm.note}
					aria-label="Sleep note"
					rows="4"
					placeholder="Woke up twice but fell back asleep quickly."
				></textarea>
			</Field>
			<Field className="spaced-field" label="Restfulness (optional, 1-5)">
				<input bind:value={page.sleepNoteForm.restfulness} aria-label="Sleep restfulness" type="number" min="1" max="5" />
			</Field>
			<Field className="spaced-field" label="Context (optional)">
				<input bind:value={page.sleepNoteForm.context} aria-label="Sleep context" placeholder="Late caffeine" />
			</Field>
			<Button onclick={saveSleepNote}>Log sleep note</Button>
		</SectionCard>

		<SectionCard title="Medication and supplement templates">
			<Field label="Template name">
				<input bind:value={page.templateForm.label} aria-label="Template name" placeholder="Magnesium glycinate" />
			</Field>
			<Field className="spaced-field" label="Template type">
				<select bind:value={page.templateForm.templateType} aria-label="Template type">
					<option value="supplement">Supplement</option>
					<option value="medication">Medication</option>
				</select>
			</Field>
			<div class="field-grid spaced-field">
				<Field label="Default dose">
					<input bind:value={page.templateForm.defaultDose} aria-label="Default dose" type="number" min="0" step="0.1" />
				</Field>
				<Field label="Default unit">
					<input bind:value={page.templateForm.defaultUnit} aria-label="Default unit" placeholder="capsules" />
				</Field>
			</div>
			<Field className="spaced-field" label="Template note">
				<textarea
					bind:value={page.templateForm.note}
					aria-label="Template note"
					rows="3"
					placeholder="Taken with breakfast."
				></textarea>
			</Field>
			<Button onclick={saveTemplate}>Save template</Button>

			{#if page.snapshot?.templates.length}
				<ul class="template-list spaced-list">
					{#each page.snapshot.templates as template (template.id)}
						<li>
							<div>
								<strong>{template.label}</strong>
								{#each describeHealthTemplate(template) as line (line)}
									<p>{line}</p>
								{/each}
							</div>
							<Button variant="secondary" onclick={() => quickLogTemplate(template.id)}>
								Log now
							</Button>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="spaced-list">
					<EmptyState
						title="No templates saved yet."
						message="Create a medication or supplement template once, then quick-log it in one tap."
					/>
				</div>
			{/if}
		</SectionCard>

		<SectionCard title="Today’s health stream">
			{#if eventRows.length}
				<ul class="event-list">
					{#each eventRows as event (event.id)}
						<li>
							<div>
								<strong>{event.title}</strong>
								{#each event.lines as line (line)}
									<p>{line}</p>
								{/each}
								<p class="status-copy event-meta">{event.meta}</p>
							</div>
							{#if event.badge}
								<span class="event-badge">{event.badge}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<EmptyState
					title="No health events logged yet."
					message="Start with a symptom, anxiety episode, sleep note, or quick-log template."
				/>
			{/if}
		</SectionCard>
	</div>
{/if}

<style>
	.field-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
		gap: 0.85rem;
	}

	.spaced-field {
		margin-top: 0.9rem;
	}

	.spaced-list {
		margin-top: 1rem;
	}

	.event-list,
	.template-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.85rem;
	}

	.event-list li,
	.template-list li {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
	}

	.event-list p,
	.template-list p {
		margin: 0.25rem 0 0;
		color: #3a352e;
	}

	.event-meta {
		margin-top: 0.5rem;
	}

	.event-badge {
		white-space: nowrap;
		align-self: start;
		padding: 0.3rem 0.6rem;
		border-radius: 999px;
		background: #f1ebe2;
		font: 600 0.8rem/1 Manrope, system-ui, sans-serif;
	}

	@media (min-width: 960px) {
		.health-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.health-grid :global(section:first-child) {
			grid-column: 1 / -1;
		}
	}
</style>
