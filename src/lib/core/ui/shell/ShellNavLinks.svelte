<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import type { AppRouteMeta } from './navigation';

  interface Props {
    routes: AppRouteMeta[];
    variant: 'desktop' | 'mobile';
  }

  let { routes, variant }: Props = $props();

  function isActive(href: AppRouteMeta['href']): boolean {
    return page.route.id === href;
  }
</script>

{#if variant === 'desktop'}
  <ul class="shell-nav-links shell-nav-links--desktop">
    {#each routes as route (route.href)}
      <li>
        <a aria-label={route.label} class:active={isActive(route.href)} href={resolve(route.href)}>
          <span>{route.label}</span>
          <small>{route.description}</small>
        </a>
      </li>
    {/each}
  </ul>
{:else}
  <div class="shell-nav-links shell-nav-links--mobile">
    {#each routes as route (route.href)}
      <a class:active={isActive(route.href)} href={resolve(route.href)}>{route.label}</a>
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
    gap: 0.3rem;
  }

  .shell-nav-links--mobile {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.25rem;
  }

  .shell-nav-links--desktop a {
    display: grid;
    gap: 0.2rem;
    padding: 0.85rem 0.85rem 0.9rem;
    color: var(--phc-muted);
    text-decoration: none;
    font: 500 0.92rem/1.2 var(--phc-font-ui);
    border-left: 2px solid transparent;
    border: 0.5px solid transparent;
    transition:
      border-color 180ms ease,
      background-color 180ms ease,
      color 180ms ease,
      transform 180ms ease;
  }

  .shell-nav-links--desktop a span {
    color: inherit;
    font: 500 0.94rem/1.2 var(--phc-font-ui);
    letter-spacing: 0.02em;
  }

  .shell-nav-links--desktop a small {
    color: rgba(188, 237, 215, 0.7);
    font: 400 0.68rem/1.35 var(--phc-font-ui);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .shell-nav-links--mobile a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0.55rem 0.75rem;
    color: var(--phc-muted);
    text-decoration: none;
    font: 600 0.78rem/1 var(--phc-font-ui);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border-bottom: 0.5px solid transparent;
  }

  .shell-nav-links a:hover {
    background: rgba(10, 60, 45, 0.32);
    color: var(--phc-text);
  }

  .shell-nav-links a:focus-visible {
    outline: 2px solid var(--phc-label);
    outline-offset: 2px;
  }

  .shell-nav-links a.active {
    background: rgba(10, 60, 45, 0.48);
    color: var(--phc-label);
    border-color: rgba(233, 195, 73, 0.24);
    border-left-color: var(--phc-label);
    transform: translateX(2px);
  }

  .shell-nav-links--mobile a.active {
    transform: none;
    border-bottom-color: var(--phc-label);
    border-left-color: transparent;
  }
</style>
