<script lang="ts">
	import { resolve } from '$app/paths';
	import type { DeviceSourceManifest } from '$lib/features/integrations/manifests/device-sources';
	import { buildNoMacSetupModel } from '$lib/features/integrations/setup-presenters';

	interface Props {
		manifest: DeviceSourceManifest;
		showNavigationLinks?: boolean;
	}

	let { manifest, showNavigationLinks = true }: Props = $props();
	let setupModel = $derived(buildNoMacSetupModel(manifest, showNavigationLinks));
</script>

<div class="setup-stack">
	<div class="resource-card">
		<p class="eyebrow">No-Mac Path</p>
		<p class="resource-copy">
			{setupModel.resourceDescription}
		</p>
		<p class="resource-links">
			{#each setupModel.primaryLinks as link (link.label)}
				<a href={resolve(link.route)} download={link.download ? '' : undefined} target={link.download ? undefined : '_blank'} rel={link.download ? undefined : 'noreferrer'}>
					{link.label}
				</a>
			{/each}
		</p>
		{#if setupModel.navigationLinks.length}
			<p class="resource-links">
				{#each setupModel.navigationLinks as link (link.label)}
					<a href={resolve(link.route)}>{link.label}</a>
				{/each}
			</p>
		{/if}
	</div>

	<ol class="step-list">
		{#each setupModel.steps as step, index (step.title)}
			<li>
				<div class="step-index">{index + 1}</div>
				<div>
					<strong>{step.title}</strong>
					<p>{step.detail}</p>
				</div>
			</li>
		{/each}
	</ol>

	<div class="ships-card">
		<p class="eyebrow">What Ships In T9</p>
		<ul>
			{#each setupModel.ships as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</div>
</div>

<style>
	.setup-stack {
		display: grid;
		gap: 1rem;
	}

	.eyebrow {
		margin: 0 0 0.5rem;
		color: #655e54;
		font: 700 0.75rem/1.2 Manrope, system-ui, sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.resource-card,
	.ships-card {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(241, 235, 226, 0.62);
		border: 1px solid rgba(31, 29, 26, 0.06);
	}

	.resource-copy,
	.step-list p {
		margin: 0;
		color: #655e54;
		font: 400 0.95rem/1.55 Manrope, system-ui, sans-serif;
	}

	.resource-links {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin: 0.9rem 0 0;
	}

	.resource-links a {
		color: #1f5c4a;
		font-weight: 600;
	}

	.step-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.85rem;
	}

	.step-list li {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.85rem;
		padding: 0.9rem 0;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
	}

	.step-list li:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.step-index {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		background: #1f5c4a;
		color: #fbf8f3;
		font: 700 0.9rem/1 Manrope, system-ui, sans-serif;
	}

	.step-list strong {
		display: block;
		margin-bottom: 0.2rem;
		font: 600 1rem/1.3 Manrope, system-ui, sans-serif;
		color: #1f1d1a;
	}

	.ships-card ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 0.55rem;
	}
</style>
