<script lang="ts">
	import AppLayout from '$lib/core/ui/AppLayout.svelte';

	let { children } = $props();
</script>

<AppLayout>
	{@render children?.()}
</AppLayout>
