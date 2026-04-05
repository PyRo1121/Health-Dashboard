<script lang="ts">
  import { resolve } from '$app/paths';
  import type { AppRouteMeta } from './navigation';

  interface Props {
    routes: AppRouteMeta[];
    variant: 'desktop' | 'mobile';
  }

  let { routes, variant }: Props = $props();
</script>

{#if variant === 'desktop'}
  <ul class="shell-nav-links shell-nav-links--desktop">
    {#each routes as route (route.href)}
      <li>
        <a href={resolve(route.href)}>{route.label}</a>
      </li>
    {/each}
  </ul>
{:else}
  <div class="shell-nav-links shell-nav-links--mobile">
    {#each routes as route (route.href)}
      <a href={resolve(route.href)}>{route.label}</a>
    {/each}
  </div>
{/if}

<style>
  .shell-nav-links {
    display: grid;
  }

  .shell-nav-links--desktop {
    list-style: none;
    padding: 0;
    margin: 0;
    gap: 0.4rem;
  }

  .shell-nav-links--mobile {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.25rem;
  }

  .shell-nav-links--desktop a {
    display: block;
    padding: 0.65rem 0.8rem;
    border-radius: 0.8rem;
    color: #3a352e;
    text-decoration: none;
    font:
      500 0.95rem/1.2 Manrope,
      system-ui,
      sans-serif;
  }

  .shell-nav-links--mobile a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    border-radius: 999px;
    color: #3a352e;
    text-decoration: none;
    font:
      600 0.88rem/1 Manrope,
      system-ui,
      sans-serif;
  }

  .shell-nav-links a:hover {
    background: rgba(31, 92, 74, 0.08);
    color: #1f5c4a;
  }
</style>
