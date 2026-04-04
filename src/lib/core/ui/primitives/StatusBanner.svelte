<script lang="ts">
	interface Props {
		title: string;
		message: string;
		tone?: 'neutral' | 'warning' | 'risk';
	}

	let { title, message, tone = 'neutral' }: Props = $props();
</script>

<div class={`status-banner status-banner--${tone}`} role="status">
	<strong>{title}</strong>
	<p>{message}</p>
</div>

<style>
	.status-banner {
		padding: 0.9rem 1rem;
		border-radius: 1rem;
		border: 1px solid rgba(31, 29, 26, 0.08);
	}

	.status-banner--neutral {
		background: #f1ebe2;
	}

	.status-banner--warning {
		background: rgba(181, 84, 60, 0.12);
	}

	.status-banner--risk {
		background: rgba(123, 45, 38, 0.12);
	}

	.status-banner p {
		margin: 0.35rem 0 0;
	}
</style>
