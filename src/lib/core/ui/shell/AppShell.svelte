<script lang="ts">
  import { page } from '$app/state';
  import MobileNav from './MobileNav.svelte';
  import SideNav from './SideNav.svelte';
  import { getAppSectionMeta } from './section-metadata';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  let activeSection = $derived(getAppSectionMeta((page.route.id ?? '/') as never));
  let todayStamp = $derived(
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date())
  );
</script>

<div class="app-shell">
  <SideNav />
  <div class="app-shell__frame">
    <header class="app-shell__topbar">
      <div class="app-shell__title-group">
        <p class="app-shell__eyebrow">Sovereign Analyst</p>
        <p class="app-shell__section-title">{activeSection.title}</p>
      </div>
      <div class="app-shell__status-cluster" aria-label="Current app context">
        <span>Local-first archive</span>
        <span>{todayStamp}</span>
      </div>
    </header>
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

  .app-shell__topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1rem 1.1rem;
    background: rgba(0, 23, 15, 0.88);
    border-bottom: 0.5px solid var(--phc-border-soft);
    backdrop-filter: blur(18px);
  }

  .app-shell__title-group {
    display: grid;
    gap: 0.25rem;
  }

  .app-shell__eyebrow {
    margin: 0;
    color: var(--phc-label);
    font: 600 0.68rem/1.1 var(--phc-font-ui);
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }

  .app-shell__section-title {
    margin: 0;
    color: var(--phc-text);
    font: 500 clamp(1.25rem, 2vw, 1.6rem) / 1 var(--phc-font-display);
    font-style: italic;
  }

  .app-shell__status-cluster {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
    color: var(--phc-muted);
    font: 500 0.74rem/1.1 var(--phc-font-ui);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .app-shell__status-cluster span {
    padding-bottom: 0.2rem;
    border-bottom: 0.5px solid var(--phc-border-ghost);
  }

  .app-shell__main {
    flex: 1;
    padding: 1.5rem 1rem 5.25rem;
  }

  @media (min-width: 960px) {
    .app-shell__topbar {
      padding: 1.25rem 2rem 1.3rem;
    }

    .app-shell__main {
      padding: 2.25rem 2rem 2rem;
    }
  }
</style>
