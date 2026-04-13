<script lang="ts">
  import { DESKTOP_NAV_ROUTES } from './navigation';
  import ShellNavLinks from './ShellNavLinks.svelte';
</script>

<nav aria-label="Primary" class="side-nav">
  <div class="side-nav__brand">
    <p class="side-nav__eyebrow">Sovereign</p>
    <div class="side-nav__identity">
      <span class="side-nav__glyph">SA</span>
      <div>
        <strong>Sovereign Analyst</strong>
        <p>Local-first health intelligence</p>
      </div>
    </div>
  </div>
  <ShellNavLinks routes={DESKTOP_NAV_ROUTES} variant="desktop" />
</nav>

<style>
  .side-nav {
    display: none;
    min-height: 100dvh;
    padding: 1.4rem 1rem 1.2rem;
    background: linear-gradient(180deg, rgba(0, 18, 11, 0.98) 0%, rgba(0, 23, 15, 0.98) 100%);
    border-right: 0.5px solid var(--phc-border-soft);
  }

  .side-nav__brand {
    margin-bottom: 1.75rem;
  }

  .side-nav__eyebrow {
    margin: 0 0 0.8rem;
    color: var(--phc-label);
    font: 600 0.68rem/1.1 var(--phc-font-ui);
    letter-spacing: 0.26em;
    text-transform: uppercase;
  }

  .side-nav__identity {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    align-items: center;
  }

  .side-nav__glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.35rem;
    height: 2.35rem;
    color: var(--phc-label);
    background: var(--phc-surface-high);
    border: 0.5px solid var(--phc-border-soft);
    box-shadow: 0 12px 24px rgba(0, 18, 11, 0.24);
    font: 600 0.8rem/1 var(--phc-font-ui);
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .side-nav__identity strong {
    display: block;
    color: var(--phc-text);
    font: 500 1.15rem/1 var(--phc-font-display);
    font-style: italic;
  }

  .side-nav__identity p {
    margin: 0.3rem 0 0;
    color: var(--phc-muted);
    font: 400 0.78rem/1.35 var(--phc-font-ui);
  }

  @media (min-width: 960px) {
    .side-nav {
      display: block;
      width: 16.5rem;
      flex: 0 0 16.5rem;
    }
  }
</style>
