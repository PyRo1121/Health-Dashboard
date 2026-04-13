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
    padding: 0.95rem 1rem;
    border: 0.5px solid var(--phc-border-soft);
    background: rgba(10, 60, 45, 0.18);
  }

  .status-banner--neutral {
    background: linear-gradient(180deg, rgba(233, 195, 73, 0.16) 0%, rgba(233, 195, 73, 0.08) 100%);
    border-color: rgba(233, 195, 73, 0.22);
  }

  .status-banner--warning {
    background: linear-gradient(180deg, rgba(181, 84, 60, 0.22) 0%, rgba(181, 84, 60, 0.1) 100%);
    border-color: rgba(181, 84, 60, 0.22);
  }

  .status-banner--risk {
    background: linear-gradient(180deg, rgba(123, 45, 38, 0.28) 0%, rgba(123, 45, 38, 0.14) 100%);
    border-color: rgba(123, 45, 38, 0.24);
  }

  .status-banner strong {
    color: var(--phc-text);
  }

  .status-banner p {
    margin: 0.35rem 0 0;
    color: var(--phc-text);
  }
</style>
