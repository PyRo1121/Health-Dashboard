<script lang="ts">
  import MobileNav from './MobileNav.svelte';
  import SideNav from './SideNav.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="app-shell">
  <SideNav />
  <div class="app-shell__frame">
    <main aria-label="Main content" class="app-shell__main">
      {@render children?.()}
    </main>
    <MobileNav />
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    min-height: 100dvh;
  }

  .app-shell__frame {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .app-shell__main {
    flex: 1;
    padding: 1.5rem 1rem 5.5rem;
  }

  @media (min-width: 960px) {
    .app-shell__main {
      padding: 2rem;
    }
  }
</style>
