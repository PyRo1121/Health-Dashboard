<script lang="ts">
  import { SectionCard } from '$lib/core/ui/primitives';

  let {
    headline,
    daysTracked,
  }: {
    headline: string;
    daysTracked: number;
  } = $props();
</script>

<SectionCard title="Weekly headline">
  <h3 class="card-headline">{headline}</h3>
  <p class="status-copy">Tracked days: {daysTracked}</p>
</SectionCard>

<style>
  .card-headline {
    margin: 0;
    font:
      500 2rem/1.05 Newsreader,
      Georgia,
      serif;
  }
</style>
