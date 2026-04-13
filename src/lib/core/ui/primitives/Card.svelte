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
    display: grid;
    gap: 0.2rem;
    padding: 1.25rem;
    background:
      linear-gradient(180deg, rgba(10, 60, 45, 0.18) 0%, rgba(0, 23, 15, 0.92) 100%),
      var(--phc-surface-low);
    border: 0.5px solid var(--phc-border-soft);
    box-shadow: var(--phc-shadow-ambient);
  }

  @media (max-width: 639px) {
    .card {
      padding: 1rem;
    }
  }

  @media (min-width: 960px) {
    .card {
      padding: 1.35rem;
    }
  }
</style>
