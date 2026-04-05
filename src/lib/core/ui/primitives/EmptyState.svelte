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
  .empty-state h2 {
    margin: 0;
    font:
      500 1.3rem/1.1 Newsreader,
      Georgia,
      serif;
  }

  .empty-state p {
    margin: 0.4rem 0 0;
    color: #655e54;
    font:
      400 0.95rem/1.5 Manrope,
      system-ui,
      sans-serif;
  }
</style>
