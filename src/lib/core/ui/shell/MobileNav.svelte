<script lang="ts">
  import { MOBILE_NAV_ROUTES } from './navigation';
  import ShellNavLinks from './ShellNavLinks.svelte';
</script>

<nav aria-label="Mobile" class="mobile-nav">
  <ShellNavLinks routes={MOBILE_NAV_ROUTES} variant="mobile" />
</nav>

<style>
  .mobile-nav {
    position: sticky;
    bottom: 0;
    padding: 0.55rem 0.65rem calc(0.6rem + env(safe-area-inset-bottom));
    background: rgba(0, 23, 15, 0.94);
    border-top: 0.5px solid var(--phc-border-soft);
    backdrop-filter: blur(16px);
  }

  @media (min-width: 960px) {
    .mobile-nav {
      display: none;
    }
  }
</style>
