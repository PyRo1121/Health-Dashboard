<script lang="ts">
  let {
    warnings,
  }: {
    warnings: string[];
  } = $props();
</script>

{#if warnings.length}
  <ul class="warning-list">
    {#each warnings as warning (warning)}
      <li>{warning}</li>
    {/each}
  </ul>
{/if}

<style>
  .warning-list {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.5rem;
    color: #8e3c2e;
  }
</style>
