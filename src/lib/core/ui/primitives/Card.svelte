<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="card">
	{@render children?.()}
</section>

<style>
	.card {
		padding: 1rem;
		border-radius: 1rem;
		background: rgba(251, 248, 243, 0.92);
		border: 1px solid rgba(31, 29, 26, 0.06);
	}
</style>
