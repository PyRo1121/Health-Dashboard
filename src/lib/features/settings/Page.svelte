<script lang="ts">
	import { Button, Card, Field, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
	import {
		clearSettingsPage,
		createSettingsPageState,
		loadSettingsPage,
		saveSettingsPage
	} from '$lib/features/settings/controller';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import {
		canSaveOwnerProfileForm,
		settingsLocalFirstPostureItems,
		settingsOwnerProfileDescription
	} from '$lib/features/settings/model';
	import NoMacSetupChecklist from '$lib/features/integrations/NoMacSetupChecklist.svelte';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
	import { DEVICE_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/device-sources';

	const healthkitManifest = DEVICE_SOURCE_MANIFESTS[0];
	let page = $state(createSettingsPageState());

	function loadOwnerProfile() {
		page = loadSettingsPage();
	}

	let canSaveOwnerProfile = $derived(canSaveOwnerProfileForm(page.fullName, page.birthDate));

	function handleSaveOwnerProfile() {
		page = saveSettingsPage({
			fullName: page.fullName,
			birthDate: page.birthDate
		});
	}

	function handleClearOwnerProfile() {
		page = clearSettingsPage();
	}

	onBrowserRouteMount(loadOwnerProfile);
</script>

<RoutePageHeader href="/settings" />

<div class="page-grid settings-grid">
	<Card>
		<h2 class="card-title">iPhone setup</h2>
		<NoMacSetupChecklist manifest={healthkitManifest} showNavigationLinks={false} />
	</Card>

	<SectionCard title="Clinical owner profile" intro={settingsOwnerProfileDescription}>
		<Field className="field-block" label="Owner full name">
			<input bind:value={page.fullName} aria-label="Owner full name" placeholder="Pyro Example" />
		</Field>

		<Field className="field-block" label="Owner birth date">
			<input bind:value={page.birthDate} aria-label="Owner birth date" type="date" />
		</Field>

		<div class="button-row">
			<Button onclick={handleSaveOwnerProfile} disabled={!canSaveOwnerProfile}>
				Save owner profile
			</Button>
			<Button variant="ghost" onclick={handleClearOwnerProfile}>
				Clear owner profile
			</Button>
		</div>

		{#if page.statusMessage}
			<StatusBanner tone="neutral" title="Owner profile" message={page.statusMessage} />
		{/if}
	</SectionCard>

	<SectionCard title="Local-first posture">
		<p class="status-copy">
			Every external feed is staged before commit. No device or portal source writes directly into feature-specific tables.
		</p>
		<ul class="summary-list">
			{#each settingsLocalFirstPostureItems as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</SectionCard>
</div>

<style>
	.summary-list {
		display: grid;
		gap: 0.5rem;
		color: #655e54;
		font: 400 0.95rem/1.5 Manrope, system-ui, sans-serif;
	}

	.button-row {
		margin-top: 1rem;
	}

	@media (min-width: 960px) {
		.settings-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
