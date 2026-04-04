<script lang="ts">
	interface Props {
		label: string;
		id?: string;
		hint?: string;
		className?: string;
		children?: import('svelte').Snippet;
	}

	let { label, id, hint, className = '', children }: Props = $props();
</script>

<label class={`field ${className}`.trim()} for={id}>
	<span class="field__label">{label}</span>
	<div class="field__control">
		{@render children?.()}
	</div>
	{#if hint}
		<span class="field__hint">{hint}</span>
	{/if}
</label>

<style>
	.field {
		display: grid;
		gap: 0.4rem;
	}

	.field__label {
		font: 500 0.9rem/1.3 Manrope, system-ui, sans-serif;
		color: #3a352e;
	}

	.field__control :global(input),
	.field__control :global(select),
	.field__control :global(textarea) {
		width: 100%;
		box-sizing: border-box;
		min-height: 44px;
		padding: 0.75rem 0.9rem;
		border: 1px solid rgba(31, 29, 26, 0.12);
		border-radius: 0.9rem;
		background: #fbf8f3;
		color: #1f1d1a;
		font: 400 0.95rem/1.45 Manrope, system-ui, sans-serif;
	}

	.field__control :global(textarea) {
		min-height: 8rem;
		resize: vertical;
	}

	.field__hint {
		color: #655e54;
		font: 400 0.85rem/1.45 Manrope, system-ui, sans-serif;
	}
</style>
