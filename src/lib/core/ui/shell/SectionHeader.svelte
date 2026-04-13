<script lang="ts">
  interface Props {
    title: string;
    description: string;
    eyebrow?: string;
  }

  let { title, description, eyebrow }: Props = $props();
</script>

{#if eyebrow}
  <p class="eyebrow eyebrow-label">{eyebrow}</p>
{/if}
<header class="section-header">
  <h1>{title}</h1>
  <p>{description}</p>
</header>

<style>
  .eyebrow {
    margin-bottom: 0.7rem;
  }

  .section-header {
    padding-bottom: 1.15rem;
    border-bottom: 0.5px solid var(--phc-border-soft);
  }

  .section-header h1 {
    margin: 0;
    color: var(--phc-text);
    font: 500 clamp(2rem, 4vw, 2.8rem) / 1.02 var(--phc-font-display);
    font-style: italic;
    letter-spacing: -0.02em;
  }

  .section-header p {
    max-width: 42rem;
    margin: 0.75rem 0 0;
    color: var(--phc-muted);
    font: 400 1rem/1.65 var(--phc-font-ui);
  }

  @media (max-width: 639px) {
    .eyebrow {
      margin-bottom: 0.55rem;
    }

    .section-header {
      padding-bottom: 1rem;
    }

    .section-header h1 {
      font-size: clamp(1.7rem, 8vw, 2.15rem);
    }

    .section-header p {
      margin-top: 0.55rem;
      font-size: 0.92rem;
      line-height: 1.55;
    }
  }
</style>
