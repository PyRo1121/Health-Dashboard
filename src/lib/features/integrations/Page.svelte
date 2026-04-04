<script lang="ts">
	import { Card, EmptyState, SectionCard, StatusBanner } from '$lib/core/ui/primitives';
	import {
		buildClinicalConnectorRows,
		buildNativeCompanionSummaryRows
	} from '$lib/features/integrations/setup-presenters';
	import {
		createIntegrationsPageState,
		loadIntegrationsPage
	} from '$lib/features/integrations/client';
	import {
		createConnectionStatusModel,
		integrationsClinicalInteroperabilityCopy,
		integrationsIdentityGateMessage,
		integrationsOperatorNotes
	} from '$lib/features/integrations/model';
	import { onBrowserRouteMount } from '$lib/core/ui/route-runtime';
	import { CLINICAL_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/clinical-sources';
	import NoMacSetupChecklist from '$lib/features/integrations/NoMacSetupChecklist.svelte';
	import RoutePageHeader from '$lib/core/ui/shell/RoutePageHeader.svelte';
	import { DEVICE_SOURCE_MANIFESTS } from '$lib/features/integrations/manifests/device-sources';

	let page = $state(createIntegrationsPageState());

	const healthkitManifest = DEVICE_SOURCE_MANIFESTS[0];
	let nativeSummaryRows = $derived(buildNativeCompanionSummaryRows(page.summary));
	let clinicalConnectorRows = $derived(buildClinicalConnectorRows(CLINICAL_SOURCE_MANIFESTS));
	let connectionStatus = $derived(createConnectionStatusModel(page.summary));

	async function refreshSummary() {
		page = await loadIntegrationsPage();
	}

	onBrowserRouteMount(refreshSummary);
</script>

<RoutePageHeader href="/integrations" />

{#if page.loading}
	<p class="status-copy">Loading connection status…</p>
{:else}
	<div class="page-grid integrations-grid">
		<Card>
			<h2 class="card-title">{healthkitManifest.label}</h2>
			<NoMacSetupChecklist manifest={healthkitManifest} />
		</Card>

		<SectionCard title="Connection status">
			{#if connectionStatus.isConnected}
				<StatusBanner
					tone="neutral"
					title="Connected"
					message={connectionStatus.message}
				/>
			{:else}
				<EmptyState
					title="Not connected yet."
					message={connectionStatus.message}
				/>
			{/if}

			{#if nativeSummaryRows.length}
				<div class="summary-block">
					{#each nativeSummaryRows as row (row)}
						<p>{row}</p>
					{/each}
				</div>
			{/if}
		</SectionCard>

		<SectionCard title="Operator notes" intro={integrationsOperatorNotes} />

		<SectionCard title="Clinical interoperability" intro={integrationsClinicalInteroperabilityCopy}>
			<StatusBanner
				tone="warning"
				title="Identity gate required"
				message={integrationsIdentityGateMessage}
			/>

			<div class="table-scroll">
				<table aria-label="Clinical connector capability matrix" class="capability-table">
					<thead>
						<tr>
							<th scope="col">Connector</th>
							<th scope="col">Phase</th>
							<th scope="col">Auth</th>
							<th scope="col">Starter resources</th>
						</tr>
					</thead>
					<tbody>
						{#each clinicalConnectorRows as manifest (manifest.id)}
							<tr>
								<td>
									<strong>{manifest.label}</strong>
									<ul class="capability-notes">
										{#each manifest.capabilityNotes as note (note)}
											<li>{note}</li>
										{/each}
									</ul>
								</td>
								<td>{manifest.phase}</td>
								<td>{manifest.auth}</td>
								<td>
									<p class="resource-list">{manifest.starterResourceLabel}</p>
									<p class="identity-copy">{manifest.identityRule}</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</SectionCard>
	</div>
{/if}

<style>
	.summary-block {
		margin-top: 1rem;
		display: grid;
		gap: 0.5rem;
	}

	.table-scroll {
		margin-top: 1rem;
		overflow-x: auto;
	}

	.capability-table {
		width: 100%;
		border-collapse: collapse;
		font: 400 0.92rem/1.45 Manrope, system-ui, sans-serif;
	}

	.capability-table th,
	.capability-table td {
		padding: 0.8rem 0.75rem;
		border-bottom: 1px solid rgba(31, 29, 26, 0.08);
		text-align: left;
		vertical-align: top;
	}

	.capability-table th {
		color: #655e54;
		font: 700 0.75rem/1.2 Manrope, system-ui, sans-serif;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.capability-notes {
		margin: 0.5rem 0 0;
		padding-left: 1rem;
		display: grid;
		gap: 0.35rem;
		color: #655e54;
	}

	.resource-list,
	.identity-copy {
		margin: 0;
	}

	.identity-copy {
		margin-top: 0.45rem;
		color: #655e54;
	}

	.summary-block p {
		margin: 0;
	}

	@media (min-width: 960px) {
		.integrations-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.integrations-grid :global(section:last-child) {
			grid-column: 1 / -1;
		}
	}
</style>
