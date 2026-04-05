<script lang="ts">
  import Card from './Card.svelte';

  interface Props {
    title: string;
    intro?: string;
    titleClass?: string;
    children?: import('svelte').Snippet;
  }

  let { title, intro, titleClass = 'card-title', children }: Props = $props();
</script>

<Card>
  <h2 class={titleClass}>{title}</h2>
  {#if intro}
    <p class="status-copy section-card__intro">{intro}</p>
  {/if}
  {@render children?.()}
</Card>

<style>
  .section-card__intro {
    margin: 0 0 1rem;
  }
</style>
