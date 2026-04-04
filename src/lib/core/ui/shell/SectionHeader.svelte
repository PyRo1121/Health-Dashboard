<script lang="ts">
	interface Props {
		title: string;
		description: string;
		eyebrow?: string;
	}

	let { title, description, eyebrow }: Props = $props();
</script>

{#if eyebrow}
	<p class="eyebrow">{eyebrow}</p>
{/if}
<header class="section-header">
	<h1>{title}</h1>
	<p>{description}</p>
</header>

<style>
	.eyebrow {
		margin: 0 0 0.5rem;
		color: #655e54;
		font: 600 0.75rem/1.2 Manrope, system-ui, sans-serif;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.section-header h1 {
		margin: 0;
		color: #1f1d1a;
		font: 500 clamp(2rem, 4vw, 2.6rem) / 1.05 Newsreader, Georgia, serif;
	}

	.section-header p {
		max-width: 42rem;
		margin: 0.5rem 0 0;
		color: #3a352e;
		font: 400 1rem/1.55 Manrope, system-ui, sans-serif;
	}
</style>
