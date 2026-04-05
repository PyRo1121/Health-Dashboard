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
    padding: 0.6rem;
    background: rgba(251, 248, 243, 0.96);
    border-top: 1px solid rgba(31, 29, 26, 0.08);
    backdrop-filter: blur(16px);
  }

  @media (min-width: 960px) {
    .mobile-nav {
      display: none;
    }
  }
</style>
