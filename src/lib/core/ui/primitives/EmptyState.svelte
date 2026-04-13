<script lang="ts">
  interface Props {
    title: string;
    message: string;
  }

  let { title, message }: Props = $props();
</script>

<div class="empty-state">
  <h2>{title}</h2>
  <p>{message}</p>
</div>

<style>
  .empty-state {
    display: grid;
    gap: 0.4rem;
  }

  .empty-state h2 {
    margin: 0;
    color: var(--phc-text);
    font: 500 1.3rem/1.1 var(--phc-font-display);
  }

  .empty-state p {
    margin: 0;
    color: var(--phc-muted);
    font: 400 0.95rem/1.5 var(--phc-font-ui);
  }
</style>
