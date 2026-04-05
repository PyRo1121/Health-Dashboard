<script lang="ts">
  import { DESKTOP_NAV_ROUTES } from './navigation';
  import ShellNavLinks from './ShellNavLinks.svelte';
</script>

<nav aria-label="Primary" class="side-nav">
  <div class="side-nav__brand">Personal Health Cockpit</div>
  <ShellNavLinks routes={DESKTOP_NAV_ROUTES} variant="desktop" />
</nav>

<style>
  .side-nav {
    display: none;
    min-height: 100dvh;
    padding: 1.5rem 1rem;
    background: #f1ebe2;
    border-right: 1px solid rgba(31, 29, 26, 0.08);
  }

  .side-nav__brand {
    margin-bottom: 1.25rem;
    color: #1f1d1a;
    font:
      700 0.95rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  @media (min-width: 960px) {
    .side-nav {
      display: block;
      width: 16rem;
      flex: 0 0 16rem;
    }
  }
</style>
