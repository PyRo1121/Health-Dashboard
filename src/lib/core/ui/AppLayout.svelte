<script lang="ts">
	import { onMount } from 'svelte';
	import '../../../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { migrateLegacyIndexedDbToSqlite } from '$lib/core/db/migrate-client';
	import AppShell from './shell/AppShell.svelte';

	let { children } = $props();

	onMount(() => {
		void migrateLegacyIndexedDbToSqlite();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell>
	{@render children?.()}
</AppShell>
